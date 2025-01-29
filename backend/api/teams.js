import { Router } from "express";
import { validationMiddleware } from "../middleware/validation-middleware";
import {
  getTeams,
  getTeam,
  getTeamMembers,
  getTeamMember,
  promoteTeamMember,
  demoteTeamMember,
  updateMemberTeam,
} from "../services/teamService";
import { getTeamMemberSchema, getTeamSchema } from "../validators/schemas";
import jwt from 'jsonwebtoken';

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

// change a member's team
router.patch(
  "/:teamId/members/:memberId",
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

// Add this route after your existing team routes
router.post("/:teamId/invite", async (req, res) => {
  try {
    console.log("Invite route hit");
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
  console.log("Validate invite route hit");
  console.log("Request body:", req.body);
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

export default router;
