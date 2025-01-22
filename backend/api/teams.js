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
import { updateMemberTeamSchema } from "../validators/schemas";

const router = Router();

const teamByIdQuery = `SELECT * FROM team WHERE team_id = $1`;
const memberByIdQuery = `SELECT * FROM users WHERE user_id = $2`;

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
router.get("/:teamId", async (req, res) => {
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
});

// get all members from a team
router.get("/:teamId/members", async (req, res) => {
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
});

// get a team member by id
router.get("/:teamId/members/:memberId", async (req, res) => {
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
});

// promote a team member
router.post("/:teamId/members/:memberId/promote", async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const memberId = parseInt(req.params.memberId);
    await getTeam(teamId); // ensure team exists
    await getTeamMember(memberId); // ensure team member exists
    const promotedMember = await promoteTeamMember(teamId, memberId);
    res.status(200).json({
        success: true,
        message: `Team member promoted successfully`,
        data: promotedMember
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error promoting team member: ${error.message}`,
    });
  }
});

// demote a team member
router.post("/:teamId/members/:memberId/demote", async (req, res) => {
  try {
    const teamId = req.params.teamId;
    const memberId = parseInt(req.params.memberId);
    await getTeam(teamId); // ensure team exists
    await getTeamMember(memberId); // ensure team member exists
    const demotedMember = await demoteTeamMember(teamId, memberId);
    res.status(200).json({
        success: true,
        message: `Team member demoted successfully`,
        data: demotedMember
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error demoting team member: ${error.message}`,
    });
  }
});

// change a member's team
router.patch("/:teamId/members/:memberId", validationMiddleware(updateMemberTeamSchema), async (req, res) => {
    try {
        console.log("Debug A")
        const origTeamId = req.params.teamId;
        const memberId = parseInt(req.params.memberId);
        console.log("Debug B")
        const { teamId: newTeamId } = req.body;
        await getTeam(origTeamId); // ensure team exists
        console.log("Debug C")
        await getTeamMember(memberId); // ensure team member exists
        console.log("Debug D")
        const updatedMember = await updateMemberTeam(origTeamId, memberId, newTeamId);
        res.status(200).json({
            success: true,
            message: `Team member's team changed successfully`,
            data: updatedMember
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Error changing member's team: ${error.message}`,
        });
    }
});

export default router;
