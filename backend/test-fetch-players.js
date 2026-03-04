import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function fetchPlayersFromDb(teamIdFilter) {
  try {
    // Check for some common player table names, prioritize 'player' table
    const candidateTables = ["player", "players", "player_stats", "players_stats", "players_test"];
    let foundTable = null;

    for (const t of candidateTables) {
      const check = await pool.query(
        `SELECT to_regclass($1) IS NOT NULL AS exists`,
        [t]
      );
      if (check.rows[0] && check.rows[0].exists) {
        foundTable = t;
        console.log(`Found player table: ${foundTable}`);
        break;
      }
    }

    if (!foundTable) {
      console.log("No player table found");
      return null;
    }

    // Try a best-effort select; map available columns into expected shape
    let query = `SELECT * FROM ${foundTable}`;
    const params = [];

    if (teamIdFilter) {
      query += ` WHERE team_id = $1 OR team = $1`;
      params.push(teamIdFilter);
    }

    query += ` LIMIT 500`;

    console.log(`Executing query: ${query}`);
    const result = await pool.query(query, params);
    const rows = result.rows;
    console.log(`Query returned ${rows.length} rows`);

    const mapped = rows.map((row, idx) => ({
      id: row.player_id ?? row.id ?? row.playerid ?? idx.toString(),
      name: row.player_name ?? row.name ?? (row.first_name ? `${row.first_name} ${row.last_name || ""}`.trim() : null),
      position: row.player_batting_handedness ?? row.position ?? "",
      team: row.team_id ?? null
    }));

    console.log(`Successfully mapped ${mapped.length} players`);
    return mapped;
  } catch (error) {
    console.error("Error:", error?.message ?? error);
    return [];
  }
}

async function test() {
  console.log("Testing fetchPlayersFromDb...");
  const result = await fetchPlayersFromDb();
  console.log(`Final result: ${result.length} players`);
  if (result.length > 0) {
    console.log(`First player: ${JSON.stringify(result[0])}`);
  }
  await pool.end();
}

test();
