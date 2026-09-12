/**
 * Persist and verify password-reset OTPs. Callers must never accept a client-
 * supplied OTP for emailing, and must not reset a password without a match.
 */
import pool from "../db.js";
import { sendPasswordResetEmail } from "./emailService.js";
import {
  GENERIC_INVALID_CODE_MESSAGE,
  GENERIC_RESET_REQUEST_MESSAGE,
  MAX_OTP_ATTEMPTS,
  OTP_TTL_MS,
  evaluateOtpAttempt,
  generateNumericOtp,
  hashOtp,
  isValidResetEmail,
  normalizeResetEmail,
  shouldSendResetEmail,
} from "../lib/passwordReset.js";

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    email TEXT PRIMARY KEY,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

let tableReady = false;

function getResetSecret() {
  const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing SESSION_SECRET or JWT_SECRET");
  }
  return secret;
}

async function ensureTable() {
  if (tableReady) return;
  await pool.query(CREATE_TABLE_SQL);
  tableReady = true;
}

async function findUserByEmail(email) {
  const result = await pool.query(
    "SELECT email, cognito_user_id FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0] ?? null;
}

async function findResetRow(email) {
  const result = await pool.query(
    "SELECT email, otp_hash, expires_at, attempts, created_at FROM password_reset_tokens WHERE email = $1",
    [email]
  );
  return result.rows[0] ?? null;
}

async function deleteResetRow(email) {
  await pool.query("DELETE FROM password_reset_tokens WHERE email = $1", [email]);
}

/**
 * Issue a reset OTP for an existing account. Always returns the same public
 * message so callers cannot probe which emails are registered.
 */
export async function requestPasswordReset(rawEmail) {
  const email = normalizeResetEmail(rawEmail);
  if (!isValidResetEmail(email)) {
    const error = new Error("A valid email is required");
    error.status = 400;
    throw error;
  }

  await ensureTable();

  const user = await findUserByEmail(email);
  const existingRow = await findResetRow(email);
  const decision = shouldSendResetEmail({
    userExists: Boolean(user),
    existingRow,
  });

  if (!decision.send) {
    return { success: true, message: GENERIC_RESET_REQUEST_MESSAGE };
  }

  const otp = generateNumericOtp();
  const otpHash = hashOtp(email, otp, getResetSecret());
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await pool.query(
    `
      INSERT INTO password_reset_tokens (email, otp_hash, expires_at, attempts, created_at)
      VALUES ($1, $2, $3, 0, NOW())
      ON CONFLICT (email) DO UPDATE
        SET otp_hash = EXCLUDED.otp_hash,
            expires_at = EXCLUDED.expires_at,
            attempts = 0,
            created_at = NOW()
    `,
    [email, otpHash, expiresAt]
  );

  try {
    await sendPasswordResetEmail(email, otp);
  } catch (error) {
    await deleteResetRow(email);
    throw error;
  }

  return { success: true, message: GENERIC_RESET_REQUEST_MESSAGE };
}

async function checkOtp(rawEmail, otp) {
  const email = normalizeResetEmail(rawEmail);
  if (!isValidResetEmail(email) || typeof otp !== "string" || otp.trim().length === 0) {
    return { ok: false, email, status: 400, message: GENERIC_INVALID_CODE_MESSAGE };
  }

  await ensureTable();
  const row = await findResetRow(email);
  const result = evaluateOtpAttempt({
    row,
    email,
    otp: otp.trim(),
    secret: getResetSecret(),
  });

  if (result.ok) {
    return { ok: true, email };
  }

  if (result.incrementAttempts) {
    const updated = await pool.query(
      `
        UPDATE password_reset_tokens
        SET attempts = attempts + 1
        WHERE email = $1
        RETURNING attempts
      `,
      [email]
    );
    if (Number(updated.rows[0]?.attempts) >= MAX_OTP_ATTEMPTS) {
      await deleteResetRow(email);
    }
  } else if (result.reason === "expired") {
    await deleteResetRow(email);
  }

  return { ok: false, email, status: 400, message: GENERIC_INVALID_CODE_MESSAGE };
}

export async function verifyPasswordResetOtp(rawEmail, otp) {
  const result = await checkOtp(rawEmail, otp);
  if (!result.ok) {
    const error = new Error(result.message);
    error.status = result.status;
    throw error;
  }
  return { success: true, message: "Reset code verified" };
}

/**
 * Confirm the OTP and return the Cognito username so the caller can set a
 * new password. The OTP row is consumed only after Cognito succeeds.
 */
export async function consumePasswordResetOtp(rawEmail, otp) {
  const result = await checkOtp(rawEmail, otp);
  if (!result.ok) {
    const error = new Error(result.message);
    error.status = result.status;
    throw error;
  }

  const user = await findUserByEmail(result.email);
  if (!user?.cognito_user_id) {
    await deleteResetRow(result.email);
    const error = new Error(GENERIC_INVALID_CODE_MESSAGE);
    error.status = 400;
    throw error;
  }

  return {
    email: result.email,
    cognitoUserId: user.cognito_user_id,
    clearToken: () => deleteResetRow(result.email),
  };
}
