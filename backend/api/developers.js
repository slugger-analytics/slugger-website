import { Router } from "express";
import {
  approveDeveloper,
  declineDeveloper,
  getPendingDevelopers,
  getAllDevelopersWithWidgets,
  getAllApprovedWidgets,
} from "../services/developerService.js";
import { requireSiteAdmin } from "../middleware/permission-guards.js";
import { parseApprovalRequestId, mapApprovalServiceError } from "../lib/accountApproval.js";

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Central service error handler. Logs the full error internally and sends a
 * sanitized 500 to the client.
 */
function handleServiceError(error, res, context) {
  const known = mapApprovalServiceError(error);
  if (known) {
    console.warn(`[developers] ${context} — ${known.message}`);
    return res.status(known.status).json({ success: false, message: known.message });
  }
  console.error(`[developers] ${context} — unexpected error:`, error);
  return res.status(500).json({ success: false, message: "An unexpected error occurred." });
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /developers/pending/:developerId/approve
 * Approve a pending developer and send them their API key.
 */
router.post("/pending/:developerId/approve", requireSiteAdmin, async (req, res) => {
  const id = parseApprovalRequestId(req.params.developerId);
  if (!id) {
    return res.status(400).json({ success: false, message: "Invalid developer ID." });
  }

  try {
    const result = await approveDeveloper(id);
    console.info(`[developers] approve — developer ${id} approved`);
    const message = result.emailSent
      ? "Developer approved and API key sent."
      : "Developer approved. API key created but email could not be sent.";
    return res.status(200).json({
      success: true,
      message,
      data: result,
    });
  } catch (error) {
    return handleServiceError(error, res, `approve(${id})`);
  }
});

/**
 * POST /developers/pending/:developerId/decline
 * Decline a pending developer.
 */
router.post("/pending/:developerId/decline", requireSiteAdmin, async (req, res) => {
  const id = parseApprovalRequestId(req.params.developerId);
  if (!id) {
    return res.status(400).json({ success: false, message: "Invalid developer ID." });
  }

  try {
    await declineDeveloper(id);
    console.info(`[developers] decline — developer ${id} declined`);
    return res.status(200).json({ success: true, message: "Developer declined." });
  } catch (error) {
    return handleServiceError(error, res, `decline(${id})`);
  }
});

/**
 * GET /developers/pending
 * Fetch all pending developers awaiting approval.
 */
router.get("/pending", requireSiteAdmin, async (req, res) => {
  try {
    const result = await getPendingDevelopers();
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleServiceError(error, res, "getPendingDevelopers");
  }
});

/**
 * GET /developers/widgets
 * Fetch all approved widgets (admin use — for assigning to developers).
 */
router.get("/widgets", requireSiteAdmin, async (req, res) => {
  try {
    const result = await getAllApprovedWidgets();
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleServiceError(error, res, "getAllApprovedWidgets");
  }
});

/**
 * GET /developers
 * Fetch all developers with their associated widgets.
 */
router.get("/", requireSiteAdmin, async (req, res) => {
  try {
    const result = await getAllDevelopersWithWidgets();
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return handleServiceError(error, res, "getAllDevelopersWithWidgets");
  }
});

export default router;