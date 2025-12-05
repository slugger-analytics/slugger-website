import { Router } from "express";
import pool from "../db.js";

const router = Router();

/**
 * GET /
 * Returns the most recent scores. Query param: `limit` (optional, default 3)
 */
router.get("/", async (req, res) => {
  try {
    const rawLimit = req.query.limit;
    const parsed = parseInt(rawLimit, 10);
    const limit = Number.isNaN(parsed) ? 3 : Math.min(parsed, 100);

    const query = `
      SELECT
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
      LIMIT $1
    `;


    const result = await pool.query(query, [limit]);

    res.status(200).json({
      success: true,
      message: "Recent scores retrieved successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching recent scores:", error);
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`,
    });
  }
});

export default router;
