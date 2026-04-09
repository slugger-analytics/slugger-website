import { Router } from "express";
import pool from "../db.js";

const router = Router();

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 100;

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /scores?limit=N
 * Returns the most recent scores. Limit defaults to 3, capped at 100.
 */
router.get("/", async (req, res) => {
  const parsed = parseInt(req.query.limit, 10);
  const limit = (Number.isFinite(parsed) && parsed > 0)
    ? Math.min(parsed, MAX_LIMIT)
    : DEFAULT_LIMIT;

  try {
    const result = await pool.query(
      `SELECT
         s.game_id,
         s.home_team_name,
         s.visiting_team_name,
         s.home_team_score,
         s.visiting_team_score,
         s.game_status,
         s.innings_played,
         s.regulation_innings,
         s.field,
         s.date,
         s.gametime,
         s.timezone,
         s.last_updated
       FROM scores s
       ORDER BY s.date DESC NULLS LAST
       LIMIT $1`,
      [limit]
    );

    return res.status(200).json({
      success: true,
      message: "Recent scores retrieved successfully.",
      data: result.rows,
    });
  } catch (error) {
    console.error(`[scores] GET / — unexpected error (limit=${limit}):`, error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred.",
    });
  }
});

export default router;