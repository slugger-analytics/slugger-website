import { Router } from "express";
import { validationMiddleware } from "../middleware/validation-middleware.js";
import {
  getTeams,
  getTeam,
  getTeamMembers,
  getTeamMember,
  promoteTeamMember,
  demoteTeamMember,
  updateMemberTeam,
  setClubhouseManager,
  updateMemberRole,
} from "../services/teamService.js";
import { getTeamMemberSchema, getTeamSchema } from "../validators/schemas.js";
import jwt from 'jsonwebtoken';
import { getUserData } from "../services/widgetService.js";
import pool from "../db.js";
import { requireTeamAdmin } from "../middleware/permission-guards.js";
import { requireTeamMembership } from "../middleware/ownership-guards.js";

const router = Router();

// get all teams
router.get("/", async (req, res) => {
  try {
    const teams = await getTeams();
    res.status(200).json({
      success: true,
      message: "Teams fetched successfully",
      data: teams,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error fetching teams: ${error.message}`,
    });
  }
});

// get a team by id
router.get(
  "/:teamId",
  validationMiddleware({ paramsSchema: getTeamSchema }),
  async (req, res) => {
    try {
      const id = req.params.teamId;
      const team = await getTeam(id);
      res.status(200).json({
        success: true,
        message: "Team fetched successfully",
        data: team,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Error fetching team: ${error.message}`,
      });
    }
  },
);

// get all members from a team
router.get(
  "/:teamId/members",
  requireTeamMembership,
  validationMiddleware({ paramsSchema: getTeamSchema }),
  async (req, res) => {
    try {
      const teamId = req.params.teamId;
      const members = await getTeamMembers(teamId);
      res.status(200).json({
        success: true,
        message: `Team members fetched successfully`,
        data: members,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Error fetching team members: ${error.message}`,
      });
    }
  },
);

// get a team member by id
router.get(
  "/:teamId/members/:memberId",
  requireTeamMembership,
  validationMiddleware({ paramsSchema: getTeamMemberSchema }),
  async (req, res) => {
    try {
      const teamId = req.params.teamId;
      const memberId = parseInt(req.params.memberId);
      const member = await getTeamMember(teamId, memberId);
      res.status(200).json({
        success: true,
        message: `Team member fetched successfully`,
        data: member,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Error fetching team member: ${error.message}`,
      });
    }
  },
);

// promote a team member
router.post(
  "/:teamId/members/:memberId/promote",
  requireTeamAdmin,
  validationMiddleware({ paramsSchema: getTeamMemberSchema }),
  async (req, res) => {
    try {
      const teamId = req.params.teamId;
      const memberId = parseInt(req.params.memberId);
      await getTeam(teamId); // ensure team exists
      await getTeamMember(teamId, memberId); // ensure team member exists
      const promotedMember = await promoteTeamMember(teamId, memberId);
      res.status(200).json({
        success: true,
        message: `Team member promoted successfully`,
        data: promotedMember,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Error promoting team member: ${error.message}`,
      });
    }
  },
);

// demote a team member
router.post(
  "/:teamId/members/:memberId/demote",
  requireTeamAdmin,
  validationMiddleware({ paramsSchema: getTeamMemberSchema }),
  async (req, res) => {
    try {
      const teamId = req.params.teamId;
      const memberId = parseInt(req.params.memberId);
      await getTeam(teamId); // ensure team exists
      await getTeamMember(teamId, memberId); // ensure team member exists
      const demotedMember = await demoteTeamMember(teamId, memberId);
      res.status(200).json({
        success: true,
        message: `Team member demoted successfully`,
        data: demotedMember,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Error demoting team member: ${error.message}`,
      });
    }
  },
);

// set a team member as clubhouse manager
router.post(
  "/:teamId/members/:memberId/set-clubhouse-manager",
  requireTeamAdmin,
  validationMiddleware({ paramsSchema: getTeamMemberSchema }),
  async (req, res) => {
    try {
      const teamId = req.params.teamId;
      const memberId = parseInt(req.params.memberId);
      await getTeam(teamId); // ensure team exists
      await getTeamMember(teamId, memberId); // ensure team member exists
      const updatedMember = await setClubhouseManager(teamId, memberId);
      res.status(200).json({
        success: true,
        message: `Team member set as clubhouse manager successfully`,
        data: updatedMember,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Error setting clubhouse manager: ${error.message}`,
      });
    }
  },
);

// update a team member's role
router.post(
  "/:teamId/members/:memberId/role",
  requireTeamAdmin,
  validationMiddleware({ paramsSchema: getTeamMemberSchema }),
  async (req, res) => {
    try {
      const teamId = req.params.teamId;
      const memberId = parseInt(req.params.memberId);
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({
          success: false,
          message: "Role is required",
        });
      }

      await getTeam(teamId); // ensure team exists
      await getTeamMember(teamId, memberId); // ensure team member exists
      const updatedMember = await updateMemberRole(teamId, memberId, role);
      res.status(200).json({
        success: true,
        message: `Team member role updated successfully`,
        data: updatedMember,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Error updating member role: ${error.message}`,
      });
    }
  },
);

// change a member's team
router.patch(
  "/:teamId/members/:memberId",
  requireTeamAdmin,
  validationMiddleware({ paramsSchema: getTeamMemberSchema }),
  async (req, res) => {
    try {
      const origTeamId = req.params.teamId;
      const memberId = parseInt(req.params.memberId);
      const { teamId: newTeamId } = req.body;
      await getTeam(origTeamId); // ensure team exists
      await getTeamMember(origTeamId, memberId); // ensure team member exists
      const updatedMember = await updateMemberTeam(newTeamId, memberId);
      res.status(200).json({
        success: true,
        message: `Team member's team changed successfully`,
        data: updatedMember,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Error changing member's team: ${error.message}`,
      });
    }
  },
);

// invite a new member to a team
router.post("/:teamId/invite", requireTeamAdmin, async (req, res) => {
  try {
    const teamId = req.params.teamId;
    
    // Verify the team exists
    const team = await getTeam(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found"
      });
    }

    // Generate a unique invite token using JWT
    const token = jwt.sign(
      { 
        teamId: teamId,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      process.env.SESSION_SECRET // Using your existing session secret
    );

    res.status(200).json({
      success: true,
      message: "Invite link generated successfully",
      token
    });

  } catch (error) {
    console.error("Error generating invite link:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate invite link"
    });
  }
});

// Change from /invite/validate to a more explicit path
router.post("/validate-invite", async (req, res) => {
  try {
    const { inviteToken } = req.body;
    
    // Verify and decode the token
    const decoded = jwt.verify(inviteToken, process.env.SESSION_SECRET);
    
    // Get team info
    const team = await getTeam(decoded.teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found"
      });
    }

    res.status(200).json({
      success: true,
      team: {
        team_name: team.team_name,
        team_id: team.team_id
      }
    });
  } catch (error) {
    console.error("Error validating invite:", error);
    res.status(400).json({
      success: false,
      message: "Invalid or expired invite link"
    });
  }
});

// remove a member from a team
router.delete("/:teamId/members/:memberId", requireTeamAdmin, async (req, res) => {
  const { teamId, memberId } = req.params;
  try {
    await getTeam(teamId); // Assert team exists
    await getUserData(memberId); // Assert user exists
    const deleteQuery = `
      UPDATE users
      SET team_id = NULL
      WHERE user_id = $1
    `
    await pool.query(deleteQuery, [memberId]);
    res.status(200).json({
      success: true,
      message: "User removed from team successfully"
    })
  } catch (error) {
    console.error("Error removing team member", error);
    res.status(500).json({
      success: false,
    });
  }
})

export default router;
