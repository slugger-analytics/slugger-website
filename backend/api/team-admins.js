import { Router } from "express";
import {
  createTeamAdminRequest,
  getPendingAdminRequests,
  approveAdminRequest,
  declineAdminRequest,
  getAllTeamAdmins,
  removeAdminPermissions
} from "../services/teamAdminService.js";
import { requireSiteAdmin, requireAuth } from "../middleware/permission-guards.js";

const router = Router();

/**
 * POST /team-admins/request
 * Create a new team admin request
 * Requires: Authentication and team membership
 */
router.post("/request", requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.user_id;
    const teamId = req.session.user.team_id;
    const is_admin = req.session.user.is_admin;

    const result = await createTeamAdminRequest(userId, teamId, is_admin);

    res.status(201).json({
      success: true,
      message: "Team admin request created successfully",
      data: result
    });
  } catch (error) {
    if (error.message === 'User is already a team admin' ||
        error.message === 'A pending request already exists for this user') {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
});

/**
 * GET /team-admins/pending
 * Get all pending team admin requests
 * Requires: Site Admin
 */
router.get("/pending", requireSiteAdmin, async (req, res) => {
  try {
    const requests = await getPendingAdminRequests();

    res.status(200).json({
      success: true,
      data: requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error fetching pending requests: ${error.message}`
    });
  }
});

/**
 * POST /team-admins/pending/:requestId/approve
 * Approve a team admin request
 * Requires: Site Admin
 */
router.post("/pending/:requestId/approve", requireSiteAdmin, async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);

    if (isNaN(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID"
      });
    }

    const result = await approveAdminRequest(requestId);

    // Update session if this is the current user
    if (req.session.user && req.session.user.user_id === result.user_id) {
      req.session.user.is_admin = true;
      req.session.user.team_role = 'Team Admin';
    }

    res.status(200).json({
      success: true,
      message: "Team admin request approved",
      data: result
    });
  } catch (error) {
    if (error.message === 'Admin request not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message === 'Request has already been processed' ||
        error.message === 'User not found or not part of the team') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
});

/**
 * POST /team-admins/pending/:requestId/decline
 * Decline a team admin request
 * Requires: Site Admin
 */
router.post("/pending/:requestId/decline", requireSiteAdmin, async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);

    if (isNaN(requestId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID"
      });
    }

    await declineAdminRequest(requestId);

    res.status(200).json({
      success: true,
      message: "Team admin request declined"
    });
  } catch (error) {
    if (error.message === 'Admin request not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message === 'Request has already been processed') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
});

/**
 * GET /team-admins
 * Get all team admins across all teams
 * Requires: Site Admin
 */
router.get("/", requireSiteAdmin, async (req, res) => {
  try {
    const admins = await getAllTeamAdmins();

    res.status(200).json({
      success: true,
      data: admins
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error fetching team admins: ${error.message}`
    });
  }
});

/**
 * DELETE /team-admins/:userId
 * Remove admin permissions from a user
 * Requires: Site Admin
 */
router.delete("/:userId", requireSiteAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    const result = await removeAdminPermissions(userId);

    // Update session if this is the current user
    if (req.session.user && req.session.user.user_id === result.user_id) {
      req.session.user.is_admin = false;
      req.session.user.team_role = null;
    }

    res.status(200).json({
      success: true,
      message: "Admin permissions removed",
      data: result
    });
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message === 'User is not currently a team admin') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
});

export default router;
