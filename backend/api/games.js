import { Router } from "express";
import pool from "../db.js";

const router = Router();

/**
 * GET /
 * Returns the most recent games. Query param: `limit` (optional, default 3)
 */
router.get("/", async (req, res) => {
  try {
    const rawLimit = req.query.limit;
    const parsed = parseInt(rawLimit, 10);
    const limit = Number.isNaN(parsed) ? 3 : Math.min(parsed, 100);

    // Select the known game columns and join to team and ballpark to include readable names.
    const query = `
      SELECT
        g.game_id,
        g.home_team_id,
        g.visiting_team_id,
        g.ballpark_id,
        g.verified,
        g.date,
        g.daily_game_number,

        -- New fields from Pointstreak
        g.pointstreak_game_id,
        g.home_score,
        g.visiting_score,
        g.game_status,
        g.innings_played,
        g.regulation_innings,
        g.gametime,
        g.field,
        g.timezone,
        g.last_updated,

        ht.team_name AS home_team_name,
        vt.team_name AS visiting_team_name,
        bp.ballpark_name AS ballpark_name
      FROM game g
      LEFT JOIN team ht ON g.home_team_id = ht.team_id
      LEFT JOIN team vt ON g.visiting_team_id = vt.team_id
      LEFT JOIN ballpark bp ON g.ballpark_id = bp.ballpark_id
      ORDER BY g.date DESC NULLS LAST
      LIMIT $1
    `;


    const result = await pool.query(query, [limit]);

    res.status(200).json({
      success: true,
      message: "Recent games retrieved successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching recent games:", error);
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`,
    });
  }
});

export default router;
