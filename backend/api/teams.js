import { Router } from "express";
import pool from "../db";
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

const router = Router();

// TODO ensure we're validating path variables, not request body

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

export default router;
