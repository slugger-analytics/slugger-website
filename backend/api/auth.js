import { Router } from "express";
import cognito from "../cognito.js";
import pool from "../db.js";
import { disableCognitoAccount } from "../services/developerService.js";

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : null;
}

function validateEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized || !EMAIL_RE.test(normalized)) return null;
  return normalized;
}

/**
 * Map known Cognito error codes to { status, message } pairs.
 * Returns null if the code is unrecognized (caller should fall through to 500).
 */
function cognotoError(code) {
  const map = {
    UserNotFoundException:     { status: 404, message: "User not found." },
    NotAuthorizedException:    { status: 400, message: "User is already confirmed." },
    InvalidParameterException: { status: 400, message: "User is already confirmed." },
    CodeMismatchException:     { status: 400, message: "Invalid confirmation code." },
    ExpiredCodeException:      { status: 400, message: "Confirmation code has expired." },
    LimitExceededException:    { status: 429, message: "Too many requests — please wait before trying again." },
  };
  return map[code] ?? null;
}

function handleCognitoError(error, res, context) {
  const known = cognotoError(error.code);
  if (known) {
    console.warn(`[auth] ${context} — Cognito error ${error.code}:`, error.message);
    return res.status(known.status).json({ success: false, message: known.message });
  }
  console.error(`[auth] ${context} — unexpected Cognito error:`, error);
  return res.status(500).json({ success: false, message: "An unexpected error occurred." });
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /auth/resend-confirmation
 * Resend confirmation code for unconfirmed users.
 */
router.post("/resend-confirmation", async (req, res) => {
  const email = validateEmail(req.body?.email);
  if (!email) {
    return res.status(400).json({ success: false, message: "A valid email is required." });
  }

  try {
    await cognito.resendConfirmationCode({
      ClientId: process.env.COGNITO_APP_CLIENT_ID,
      Username: email,
    }).promise();

    console.info(`[auth] resend-confirmation — code resent to ${email}`);
    return res.status(200).json({ success: true, message: "Confirmation code resent successfully." });

  } catch (error) {
    return handleCognitoError(error, res, `resend-confirmation(${email})`);
  }
});

/**
 * POST /auth/confirm-signup
 * Confirm user signup with a confirmation code, then update pending developer
 * status and disable their Cognito account pending admin approval.
 */
router.post("/confirm-signup", async (req, res) => {
  const email = validateEmail(req.body?.email);
  const confirmationCode = req.body?.confirmationCode?.trim();

  if (!email || !confirmationCode) {
    return res.status(400).json({
      success: false,
      message: "A valid email and confirmation code are required.",
    });
  }

  // Step 1 — confirm with Cognito
  try {
    await cognito.confirmSignUp({
      ClientId: process.env.COGNITO_APP_CLIENT_ID,
      Username: email,
      ConfirmationCode: confirmationCode,
    }).promise();

    console.info(`[auth] confirm-signup — Cognito confirmed ${email}`);

  } catch (error) {
    return handleCognitoError(error, res, `confirm-signup/cognito(${email})`);
  }

  // Step 2 — update DB and disable account if this is a pending developer.
  // Kept separate so a DB failure doesn't get misreported as a Cognito failure.
  try {
    const updateResult = await pool.query(
      `UPDATE pending_developers
         SET email_confirmed = true
       WHERE email = $1
         AND email_confirmed = false
       RETURNING request_id, email, first_name, last_name`,
      [email]
    );

    const isDeveloper = updateResult.rowCount > 0;

    if (isDeveloper) {
      console.info(`[auth] confirm-signup — disabling Cognito account for pending developer ${email}`);
      await disableCognitoAccount(email);
    }

    return res.status(200).json({
      success: true,
      message: "Email confirmed successfully.",
      data: {
        isDeveloper,
        developer: updateResult.rows[0] ?? null,
      },
    });

  } catch (error) {
    console.error(`[auth] confirm-signup — post-Cognito DB/disable error for ${email}:`, error);
    return res.status(500).json({
      success: false,
      message: "Email confirmed but a server error occurred while updating your account. Please contact support.",
    });
  }
});

/**
 * GET /auth/check-status/:email
 * Return the approval status of a pending developer, or "regular_user".
 */
router.get("/check-status/:email", async (req, res) => {
  const email = validateEmail(req.params?.email);
  if (!email) {
    return res.status(400).json({ success: false, message: "A valid email is required." });
  }

  try {
    const result = await pool.query(
      `SELECT status, email_confirmed
         FROM pending_developers
        WHERE email = $1`,
      [email]
    );

    if (result.rowCount === 0) {
      return res.json({ status: "regular_user" });
    }

    const { email_confirmed } = result.rows[0];
    return res.json({
      status: email_confirmed ? "pending_approval" : "pending_confirmation",
    });

  } catch (error) {
    console.error(`[auth] check-status(${email}) — DB error:`, error);
    return res.status(500).json({ success: false, message: "An unexpected error occurred." });
  }
});

export default router;