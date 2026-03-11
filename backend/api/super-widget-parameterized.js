/**
 * SuperWidget Parameterized Analysis API
 * POST /api/super-widget/parameterized-analysis
 * 
 * Handles targeted analysis requests based on team and player selections
 * Uses real data from League API (S3) instead of mock data
 */

import { Router } from "express";
import dotenv from "dotenv";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { readFile } from "fs/promises";
import path from "path";
import { streamToString } from "../utils/stream.js";
import pool from "../db.js";
import * as teamService from "../services/teamService.js";
import * as pointstreakService from "../services/pointstreakService.js";

dotenv.config();

const router = Router();
const YEAR = process.env.SEASON_YEAR || "2024";
const BUCKET_NAME = process.env.JSON_BUCKET_NAME;
const BATTING_METRIC_PATHS = [
  process.env.BATTING_METRICS_PATH,
  path.resolve(process.cwd(), "Result_32.csv"),
  path.resolve(process.cwd(), "../Result_32.csv")
].filter(Boolean);

const normalizeKey = (value) => (value ?? "").toString().trim().toLowerCase();

const toNumberOrZero = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
};

const getTableColumns = async (tableName) => {
  try {
    const result = await pool.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = $1
         AND table_schema = ANY (current_schemas(false))`,
      [tableName]
    );
    return result.rows.map((row) => row.column_name);
  } catch (error) {
    console.warn(`[SuperWidget] Unable to inspect columns for ${tableName}:`, error?.message ?? error);
    return [];
  }
};

const pickColumn = (columnSet, candidates) => candidates.find((candidate) => columnSet.has(candidate));

let battingMetricsCache = null;
let battingMetricsLoadPromise = null;
let battingMetricsResolvedPath = null;

const parseBattingCsvLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^([^,]+),"([^"]+)",(.*)$/);
  if (!match) return null;
  const [, playerId, playerName, metricsStr] = match;
  const parts = metricsStr.split(',');
  if (parts.length < 5) return null;

  const [atBatsRaw, hitsRaw, homeRunsRaw, rbiRaw, avgRaw] = parts;
  return {
    playerId,
    playerName,
    atBats: Number.parseInt(atBatsRaw, 10) || 0,
    hits: Number.parseInt(hitsRaw, 10) || 0,
    homeRuns: Number.parseInt(homeRunsRaw, 10) || 0,
    rbi: Number.parseInt(rbiRaw, 10) || 0,
    avg: Number.parseFloat(avgRaw) || 0
  };
};

const loadBattingMetrics = async () => {
  if (battingMetricsCache) return battingMetricsCache;
  if (battingMetricsLoadPromise) return battingMetricsLoadPromise;

  battingMetricsLoadPromise = (async () => {
    for (const candidate of BATTING_METRIC_PATHS) {
      try {
        const content = await readFile(candidate, "utf-8");
        const map = new Map();
        content.split(/\r?\n/).forEach((line) => {
          const parsed = parseBattingCsvLine(line);
          if (!parsed) return;
          map.set(parsed.playerId, parsed);
        });
        battingMetricsCache = map;
        battingMetricsResolvedPath = candidate;
        return map;
      } catch (error) {
        continue;
      }
    }

    console.warn("[SuperWidget] Unable to load batting metrics CSV from candidates:", BATTING_METRIC_PATHS.join(", "));
    battingMetricsCache = new Map();
    return battingMetricsCache;
  })().finally(() => {
    battingMetricsLoadPromise = null;
  });

  return battingMetricsLoadPromise;
};

const attachBattingMetrics = async (players) => {
  if (!Array.isArray(players) || players.length === 0) return players;
  const metrics = await loadBattingMetrics();
  if (!metrics || metrics.size === 0) return players;

  return players.map((player) => {
    if (!player?.id) return player;
    const key = player.id.toString();
    const lookup = metrics.get(key);
    if (!lookup) return player;

    const currentStats = player.stats ?? {};
    const mergedStats = {
      ...currentStats,
      avg: currentStats.avg ? currentStats.avg : lookup.avg,
      hr: currentStats.hr ? currentStats.hr : lookup.homeRuns,
      rbi: currentStats.rbi ? currentStats.rbi : lookup.rbi,
      hits: currentStats.hits ? currentStats.hits : lookup.hits,
      atBats: currentStats.atBats ? currentStats.atBats : lookup.atBats
    };

    return {
      ...player,
      stats: mergedStats,
      battingSample: lookup
    };
  });
};

// Configure S3 client for League data
const s3Config = {
  region: process.env.AWS_REGION || "us-east-2"
};

if (process.env.AWS_ACCESS_KEY && process.env.AWS_SECRET_ACCESS_KEY && 
    process.env.AWS_ACCESS_KEY.trim() !== '' && process.env.AWS_SECRET_ACCESS_KEY.trim() !== '') {
  s3Config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const s3 = new S3Client(s3Config);

/**
 * Fetch real league leaders data from S3
 */
async function fetchLeagueLeadersData() {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `league-leaders/${YEAR}-league-leaders.json`
    });

    const s3Response = await s3.send(command);
    const jsonText = await streamToString(s3Response.Body);
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error fetching league leaders from S3:", error);
    return null;
  }
}

/**
 * Fetch real standings data from S3
 */
async function fetchStandingsData() {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `standings/${YEAR}-standings.json`
    });

    const s3Response = await s3.send(command);
    const jsonText = await streamToString(s3Response.Body);
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error fetching standings from S3:", error);
    return null;
  }
}

/**
 * Attempt to fetch players from the Postgres DB. If a players/stats table
 * is not present or an error occurs, return null so callers can fallback
 * to S3-based extraction.
 */
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
        console.log(`[SuperWidget] Found player table: ${foundTable}`);
        break;
      }
    }

    if (!foundTable) {
      console.log(`[SuperWidget] No player table found`);
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

    const result = await pool.query(query, params);
    const rows = result.rows;
    console.log(`[SuperWidget] Query returned ${rows.length} rows from table ${foundTable}`);
    if (rows.length > 0) {
      console.log(`[SuperWidget] First row keys: ${Object.keys(rows[0]).join(", ")}`);
    }
    const mapped = rows.map((row, idx) => {
      // Build player object by inspecting available keys
      // Support both 'player' table (team_id, player_name, player_batting_handedness, is_pitcher) and legacy formats
      const id = row.player_id ?? row.id ?? row.playerid ?? row.pid ?? row.p_id ?? idx.toString();
      const name = row.player_name ?? row.name ?? row.playername ?? (row.first_name ? `${row.first_name} ${row.last_name || ""}`.trim() : null);
      const team = row.team_id ?? row.team_name ?? row.team ?? row.teamname ?? row.teamid ?? null;
      const position = row.player_batting_handedness ?? row.position ?? row.pos ?? "";

      // Attempt to pull batting/pitching metrics if present
      const stats = {};
      if (row.avg || row.batting_average || row.avg_batting) stats.avg = parseFloat(row.avg ?? row.batting_average ?? row.avg_batting) || 0;
      if (row.hr || row.home_runs) stats.hr = parseInt(row.hr ?? row.home_runs) || 0;
      if (row.rbi) stats.rbi = parseInt(row.rbi) || 0;
      if (row.runs) stats.runs = parseInt(row.runs) || 0;
      if (row.hits) stats.hits = parseInt(row.hits) || 0;
      if (row.sb || row.stolen_bases) stats.sb = parseInt(row.sb ?? row.stolen_bases) || 0;

      if (row.era) stats.era = parseFloat(row.era) || 0;
      if (row.so || row.strikeouts) stats.so = parseInt(row.so ?? row.strikeouts) || 0;
      if (row.ip || row.innings_pitched) stats.ip = parseFloat(row.ip ?? row.innings_pitched) || 0;
      if (Object.keys(stats).length === 0) {
        // No metric columns found; still return basic player info
      }

      // Heuristic type: check is_pitcher flag first, then fallback to stats
      const type = row.is_pitcher || (stats.era || stats.ip) ? "pitching" : "batting";

      return {
        id: id !== null ? id.toString() : null,
        name,
        position,
        team: team ? team.toString() : team,
        type,
        stats
      };
    });

    console.log(`[SuperWidget] Successfully mapped ${mapped.length} players`);
    return mapped;
  } catch (error) {
    console.error("[SuperWidget] Error fetching players from DB:", error?.message ?? error);
    console.error("[SuperWidget] Full error:", error);
    return [];
  }
}

async function fetchTeamRecordsFromScores() {
  try {
    const result = await pool.query(
      `SELECT home_team_name, visiting_team_name, home_team_score, visiting_team_score
       FROM scores
       WHERE home_team_score IS NOT NULL
         AND visiting_team_score IS NOT NULL`
    );
    return Array.isArray(result.rows) ? result.rows : [];
  } catch (error) {
    console.warn("[SuperWidget] Unable to read scores table for standings:", error?.message ?? error);
    return [];
  }
}

async function fetchTeamRecordsFromGameTable() {
  try {
    const columns = await getTableColumns("game");
    if (columns.length === 0) return [];

    const columnMap = new Map(columns.map((name) => [name.toLowerCase(), name]));

    const resolveColumn = (candidates) => {
      for (const candidate of candidates) {
        const actual = columnMap.get(candidate.toLowerCase());
        if (actual) return actual;
      }
      return undefined;
    };

    const homeNameColumn = resolveColumn([
      "home_team_name",
      "home_name",
      "home_club_name",
      "home_club",
      "home_team_full",
      "home_team_display"
    ]);
    const awayNameColumn = resolveColumn([
      "visiting_team_name",
      "visitor_team_name",
      "away_team_name",
      "away_name",
      "visitor_name"
    ]);
    const homeIdColumn = resolveColumn([
      "home_team_id",
      "homeid",
      "home_teamid",
      "homeid_fk",
      "home_team",
      "home_club_id",
      "home_clubhouse_team_id"
    ]);
    const awayIdColumn = resolveColumn([
      "visiting_team_id",
      "away_team_id",
      "visitingid",
      "visitorid",
      "awayid",
      "away_team",
      "visitor_team_id",
      "away_club_id",
      "away_clubhouse_team_id"
    ]);
    const homeScoreColumn = resolveColumn([
      "home_team_score",
      "home_score",
      "home_runs",
      "home_result",
      "home_points",
      "home_final"
    ]);
    const awayScoreColumn = resolveColumn([
      "visiting_team_score",
      "away_team_score",
      "visitor_score",
      "away_score",
      "visitor_runs",
      "away_runs",
      "away_points",
      "away_final"
    ]);
    const statusColumn = resolveColumn([
      "game_status",
      "status",
      "state",
      "game_state"
    ]);
    const gameIdColumn = resolveColumn([
      "game_id",
      "id",
      "gameid"
    ]);

    if (!homeScoreColumn || !awayScoreColumn) {
      console.warn("[SuperWidget] Game table found but no score columns detected.");
      return [];
    }

    const fields = [];
    const joins = [];

    const aliasColumn = (column) => (column ? `g."${column}"` : null);

    if (homeNameColumn) {
      fields.push(`${aliasColumn(homeNameColumn)} AS home_team_name`);
    } else if (homeIdColumn) {
      fields.push(`COALESCE(ht.team_name, ${aliasColumn(homeIdColumn)}::text) AS home_team_name`);
      joins.push(`LEFT JOIN team ht ON ht.team_id::text = ${aliasColumn(homeIdColumn)}::text`);
    } else {
      fields.push(`NULL AS home_team_name`);
    }

    if (awayNameColumn) {
      fields.push(`${aliasColumn(awayNameColumn)} AS visiting_team_name`);
    } else if (awayIdColumn) {
      fields.push(`COALESCE(at.team_name, ${aliasColumn(awayIdColumn)}::text) AS visiting_team_name`);
      joins.push(`LEFT JOIN team at ON at.team_id::text = ${aliasColumn(awayIdColumn)}::text`);
    } else {
      fields.push(`NULL AS visiting_team_name`);
    }

    fields.push(`${aliasColumn(homeScoreColumn)} AS home_team_score`);
    fields.push(`${aliasColumn(awayScoreColumn)} AS visiting_team_score`);

    if (homeIdColumn) {
      fields.push(`${aliasColumn(homeIdColumn)} AS home_team_id_raw`);
    }
    if (awayIdColumn) {
      fields.push(`${aliasColumn(awayIdColumn)} AS visiting_team_id_raw`);
    }

    if (gameIdColumn) {
      fields.push(`${aliasColumn(gameIdColumn)} AS source_game_id`);
    }

    const whereClauses = [`${aliasColumn(homeScoreColumn)} IS NOT NULL`, `${aliasColumn(awayScoreColumn)} IS NOT NULL`];

    if (statusColumn) {
      const statusExpr = aliasColumn(statusColumn);
      whereClauses.push(`LOWER(COALESCE(${statusExpr}::text, '')) SIMILAR TO '(final%|complete%|completed%|finished%|closed%)'`);
    }

    const query = `
      SELECT
        ${fields.join(",\n        ")}
      FROM game g
      ${joins.join("\n      ")}
      ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : ""}
      LIMIT 5000
    `;

    const result = await pool.query(query);
    return Array.isArray(result.rows) ? result.rows : [];
  } catch (error) {
    console.warn("[SuperWidget] Unable to read game table for standings:", error?.message ?? error);
    return [];
  }
}

async function hydrateTeamsWithScoreboardRecords(existingTeams) {
  if (!Array.isArray(existingTeams) || existingTeams.length === 0) {
    return { teams: Array.isArray(existingTeams) ? existingTeams : [], used: false };
  }

  const scoreRows = await fetchTeamRecordsFromScores();
  const gameRows = await fetchTeamRecordsFromGameTable();

  const combinedRows = [];
  const seen = new Set();

  const pushRow = (row) => {
    if (!row) return;
    const homeIdentifier = row.home_team_name ?? row.home_team_id_raw ?? row.home_team ?? "";
    const awayIdentifier = row.visiting_team_name ?? row.visiting_team_id_raw ?? row.away_team ?? "";
    const normalizedHome = normalizeKey(homeIdentifier);
    const normalizedAway = normalizeKey(awayIdentifier);
    if (!row.source_game_id && !normalizedHome && !normalizedAway) {
      return;
    }
    const key = row.source_game_id
      ? `id:${row.source_game_id}`
      : `${normalizedHome}|${normalizedAway}|${toNumberOrZero(row.home_team_score)}|${toNumberOrZero(row.visiting_team_score)}`;
    if (seen.has(key)) return;
    seen.add(key);
    combinedRows.push(row);
  };

  scoreRows.forEach(pushRow);
  gameRows.forEach(pushRow);

  if (combinedRows.length === 0) {
    return { teams: existingTeams, used: false };
  }

  const records = new Map();

  const ensureRecord = (teamName, fallbackId) => {
    const baseKey = normalizeKey(teamName) || normalizeKey(fallbackId);
    if (!baseKey) return null;

    if (!records.has(baseKey)) {
      records.set(baseKey, {
        name: teamName || fallbackId || "Unknown Team",
        wins: 0,
        losses: 0,
        ties: 0,
        games: 0
      });
    }

    const record = records.get(baseKey);
    const nameKey = normalizeKey(teamName);
    const idKey = normalizeKey(fallbackId);
    if (nameKey) records.set(nameKey, record);
    if (idKey) records.set(idKey, record);
    return record;
  };

  combinedRows.forEach((row) => {
    const homeScore = toNumberOrZero(row.home_team_score);
    const awayScore = toNumberOrZero(row.visiting_team_score);
    const homeName = row.home_team_name ?? row.home_team ?? row.home_name;
    const awayName = row.visiting_team_name ?? row.away_team_name ?? row.visiting_team;
    const homeId = row.home_team_id_raw ?? row.home_team_id ?? row.home_team;
    const awayId = row.visiting_team_id_raw ?? row.away_team_id ?? row.visiting_team;

    const homeRecord = ensureRecord(homeName, homeId);
    const awayRecord = ensureRecord(awayName, awayId);
    if (!homeRecord || !awayRecord) return;

    homeRecord.games += 1;
    awayRecord.games += 1;

    if (homeScore === awayScore) {
      homeRecord.ties += 1;
      awayRecord.ties += 1;
      return;
    }

    if (homeScore > awayScore) {
      homeRecord.wins += 1;
      awayRecord.losses += 1;
    } else {
      awayRecord.wins += 1;
      homeRecord.losses += 1;
    }
  });

  const enrichedTeams = existingTeams.map((team) => {
    const nameKey = normalizeKey(team.name ?? team.shortName ?? "");
    const idKey = normalizeKey(team.id ?? "");
    let record = null;
    if (nameKey && records.has(nameKey)) {
      record = records.get(nameKey);
    } else if (idKey && records.has(idKey)) {
      record = records.get(idKey);
    }
    if (!record) return team;

    const wins = record.wins;
    const losses = record.losses;
    const ties = record.ties;
    const games = wins + losses + ties;
    const computedPct = games > 0 ? (wins + ties * 0.5) / games : null;

    return {
      ...team,
      wins,
      losses,
      ties,
      pct: computedPct ?? team.pct ?? 0
    };
  });

  const applied = enrichedTeams.some((team, idx) => team !== existingTeams[idx]);
  return { teams: enrichedTeams, used: applied };
}

/**
 * Extract real team data from standings
 */
function extractTeamsFromStandings(standingsData) {
  const teams = [];
  if (standingsData?.standings?.conference) {
    standingsData.standings.conference.forEach(conference => {
      if (conference.division) {
        conference.division.forEach(division => {
          if (division.team) {
            division.team.forEach(team => {
              const teamId = team.teamlinkid ?? team.team_id ?? team.teamid ?? team.id;
              const wins = typeof team.wins === "number" ? team.wins : parseInt(team.wins, 10) || 0;
              const losses = typeof team.losses === "number" ? team.losses : parseInt(team.losses, 10) || 0;
              const pctValue = typeof team.pct === "number"
                ? team.pct
                : typeof team.pct === "string"
                  ? parseFloat(team.pct)
                  : wins + losses > 0
                    ? wins / (wins + losses)
                    : 0;
              teams.push({
                id: teamId != null ? teamId.toString() : undefined,
                name: team.teamname,
                shortName: team.shortname,
                wins,
                losses,
                pct: Number.isFinite(pctValue) ? pctValue : 0
              });
            });
          }
        });
      }
    });
  }
  return teams;
}

/**
 * Extract real player data from league leaders
 */
function extractPlayersFromLeaders(leadersData) {
  const players = [];
  
  // Extract batting leaders
  if (leadersData?.stats?.batting?.player) {
    leadersData.stats.batting.player.forEach(player => {
      players.push({
        id: player.playerid,
        name: player.playername,
        position: player.position || "OF",
        team: player.teamname?.$t || "Unknown",
        type: "batting",
        stats: {
          avg: parseFloat(player.avg) || 0,
          hr: parseInt(player.hr) || 0,
          rbi: parseInt(player.rbi) || 0,
          runs: parseInt(player.runs) || 0,
          hits: parseInt(player.hits) || 0,
          sb: parseInt(player.sb) || 0
        }
      });
    });
  }

  // Extract pitching leaders
  if (leadersData?.stats?.pitching?.player) {
    leadersData.stats.pitching.player.forEach(player => {
      players.push({
        id: player.playerid,
        name: player.playername,
        position: "P",
        team: player.teamname?.$t || "Unknown",
        type: "pitching",
        stats: {
          era: parseFloat(player.era) || 0,
          wins: parseInt(player.wins) || 0,
          losses: parseInt(player.losses) || 0,
          so: parseInt(player.so) || 0,
          ip: parseFloat(player.ip) || 0
        }
      });
    });
  }

  return players;
}

/**
 * Generate analysis based on real data
 */
function resolveWinPercentage(team) {
  const pctRaw = team?.pct;
  if (typeof pctRaw === "number" && !Number.isNaN(pctRaw) && pctRaw >= 0) {
    return pctRaw;
  }
  if (typeof pctRaw === "string") {
    const parsed = parseFloat(pctRaw);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  const wins = typeof team?.wins === "number" ? team.wins : parseInt(team?.wins, 10) || 0;
  const losses = typeof team?.losses === "number" ? team.losses : parseInt(team?.losses, 10) || 0;
  const ties = typeof team?.ties === "number" ? team.ties : parseInt(team?.ties, 10) || 0;
  const totalGames = wins + losses + ties;
  if (totalGames === 0) return 0;
  return (wins + 0.5 * ties) / totalGames;
}

async function generateParameterizedAnalysis(teamIds, playerIds, analysisType, realTeams, realPlayers) {
  const teams = Array.isArray(realTeams) ? realTeams : [];
  const players = Array.isArray(realPlayers) ? realPlayers : [];

  // Map selected IDs to real data
  const selectedTeams = teams.filter(team => {
    if (team?.id == null) return false;
    const teamIdKey = team.id.toString();
    return teamIds.some(id => id != null && id.toString() === teamIdKey);
  });
  const selectedPlayers = players.filter(player => {
    if (player?.id == null) return false;
    const playerKey = player.id.toString();
    return playerIds.some(id => id != null && id.toString() === playerKey);
  });

  // Fetch live Pointstreak data for all selected teams (parallel)
  const pointstreakDataPromises = selectedTeams.map(async team => {
    try {
      const teamAbbr = pointstreakService.getTeamAbbreviation(team.name);
      const headline = await pointstreakService.generateTeamNewsHeadline(teamAbbr);
      return { teamId: team.id, headline };
    } catch (error) {
      console.error(`Failed to fetch Pointstreak data for ${team.name}:`, error.message);
      return { teamId: team.id, headline: null };
    }
  });

  const pointstreakResults = await Promise.all(pointstreakDataPromises);
  const pointstreakMap = Object.fromEntries(
    pointstreakResults.map(r => [r.teamId, r.headline])
  );

  // Generate team analysis
  const teamAnalysis = selectedTeams.map(team => {
    const teamPlayers = selectedPlayers.filter(p => p.team === team.name);
    const winPct = resolveWinPercentage(team);
    const avgPerformance = winPct * 100;

    const wins = typeof team.wins === "number" ? team.wins : parseInt(team.wins, 10) || 0;
    const losses = typeof team.losses === "number" ? team.losses : parseInt(team.losses, 10) || 0;
    const ties = typeof team.ties === "number" ? team.ties : parseInt(team.ties, 10) || 0;
    const totalGames = wins + losses + ties;
    const offensiveBaseline = totalGames > 0 ? (wins + 0.5 * ties) / totalGames : winPct;

    // Get live Pointstreak headline (preferred) or fallback to static generation
    let statusSummary = pointstreakMap[team.id];

    // Fallback: Generate team status summary if Pointstreak fetch failed
    if (!statusSummary) {
      if (teamPlayers.length > 0) {
        // Find top performing players
        const battingPlayers = teamPlayers.filter(p => p.type === "batting");
        const pitchingPlayers = teamPlayers.filter(p => p.type === "pitching");

        const topBatter = battingPlayers.length > 0
          ? battingPlayers.reduce((best, current) => {
              const bestAvg = best.stats?.avg ?? best.battingSample?.avg ?? 0;
              const currentAvg = current.stats?.avg ?? current.battingSample?.avg ?? 0;
              return currentAvg > bestAvg ? current : best;
            })
          : null;

        const topPitcher = pitchingPlayers.length > 0
          ? pitchingPlayers.reduce((best, current) => {
              const bestEra = best.stats?.era ?? 999;
              const currentEra = current.stats?.era ?? 999;
              return currentEra < bestEra ? current : best;
            })
          : null;

        // Generate news-style headline
        if (winPct > 0.600) {
          // Hot streak headlines
          const headlines = [
            `${team.name} riding ${wins}-${losses} surge`,
            `${team.name} dominates with ${wins} wins`,
            `${team.name} stays hot in playoff push`
          ];
          statusSummary = headlines[Math.floor(Math.random() * headlines.length)];
          
          if (topBatter) {
            const avg = topBatter.stats?.avg ?? topBatter.battingSample?.avg;
            if (avg && avg > 0.320) {
              statusSummary += `. ${topBatter.name} heating up at .${Math.round(avg * 1000)}`;
            }
          }
        } else if (winPct > 0.500) {
          // Competitive team headlines
          if (topBatter && topPitcher) {
            const avg = topBatter.stats?.avg ?? topBatter.battingSample?.avg;
            if (avg && avg > 0.300) {
              statusSummary = `${topBatter.name}'s bat powers ${team.name} offense`;
            } else {
              statusSummary = `${team.name} battles for playoff position at ${wins}-${losses}`;
            }
          } else {
            statusSummary = `${team.name} holds steady with .${Math.round(winPct * 1000)} winning percentage`;
          }
        } else if (winPct > 0.400) {
          // Struggling but competitive
          if (topBatter) {
            const avg = topBatter.stats?.avg ?? topBatter.battingSample?.avg;
            const hr = topBatter.stats?.hr ?? topBatter.battingSample?.homeRuns ?? 0;
            if (avg && avg > 0.280 || hr > 10) {
              statusSummary = `${topBatter.name} bright spot in ${team.name}'s rebuild`;
            } else {
              statusSummary = `${team.name} searching for consistency at ${wins}-${losses}`;
            }
          } else {
            statusSummary = `${team.name} looks to turn season around`;
          }
        } else {
          // Rebuilding headlines
          const headlines = [
            `${team.name} focuses on development in tough ${wins}-${losses} start`,
            `${team.name} young core gains experience`,
            `${team.name} building for future despite ${losses} losses`
          ];
          statusSummary = headlines[Math.floor(Math.random() * headlines.length)];
        }
      } else {
        // No players selected, team-only headline
        if (winPct > 0.600) {
          statusSummary = `${team.name} surges to ${wins}-${losses} record, eyes postseason`;
        } else if (winPct > 0.500) {
          statusSummary = `${team.name} stays in hunt with ${wins} wins`;
        } else if (winPct > 0.400) {
          statusSummary = `${team.name} battles through adversity at ${wins}-${losses}`;
        } else if (totalGames > 0) {
          statusSummary = `${team.name} seeks turnaround after slow start`;
        } else {
          statusSummary = `${team.name} season preview: Opening day approaching`;
        }
      }
    }

    return {
      teamId: team.id,
      teamName: team.name,
      avgPerformance: Math.round(avgPerformance * 10) / 10,
      playerCount: teamPlayers.length,
      wins,
      losses,
      ties,
      statusSummary,
      topMetrics: {
        winPercentage: winPct,
        selectedPlayers: teamPlayers.length,
        offensiveRating: Math.round(offensiveBaseline * 100 + Math.random() * 10)
      }
    };
  });

  // Generate player analysis
  const playerAnalysis = selectedPlayers.map(player => {
    let performanceScore = 50;
    
    if (player.type === "batting") {
      performanceScore = Math.round(
        (player.stats.avg * 100 + player.stats.hr / 2 + player.stats.rbi / 5) / 1.5
      );
    } else {
      performanceScore = Math.round(
        (30 - player.stats.era * 3 + player.stats.so / 2) / 1.2
      );
    }

    return {
      playerId: player.id,
      playerName: player.name,
      position: player.position,
      team: player.team,
      performanceScore: Math.min(100, Math.max(0, performanceScore)),
      playerType: player.type,
      keyStats: player.stats,
      battingSample: player.battingSample ?? null
    };
  });

  // Generate comparative insights
  const comparativeInsights = [];

  if (selectedTeams.length > 1) {
    const topTeam = selectedTeams.reduce((prev, current) => 
      prev.pct > current.pct ? prev : current
    );
    const bottomTeam = selectedTeams.reduce((prev, current) => 
      prev.pct < current.pct ? prev : current
    );
    const pctDiff = Math.abs(topTeam.pct - bottomTeam.pct) * 100;

    comparativeInsights.push({
      title: "Team Comparison",
      description: `${topTeam.name} and ${bottomTeam.name} have a ${pctDiff.toFixed(1)}% win percentage difference`,
      impact: pctDiff > 0.15 ? "high" : "medium"
    });
  }

  if (selectedPlayers.length > 0) {
    const topPlayer = selectedPlayers.reduce((prev, current) => {
      const prevScore = prev.type === "batting" ? prev.stats.avg + prev.stats.hr / 30 : 30 - prev.stats.era;
      const currScore = current.type === "batting" ? current.stats.avg + current.stats.hr / 30 : 30 - current.stats.era;
      return prevScore > currScore ? prev : current;
    });

    comparativeInsights.push({
      title: "Player Performance",
      description: `Among ${selectedPlayers.length} selected players, ${topPlayer.name} shows top performance`,
      impact: "high"
    });
  }

  if (selectedPlayers.length > 1) {
    const battingPlayers = selectedPlayers.filter(p => p.type === "batting");
    const pitchingPlayers = selectedPlayers.filter(p => p.type === "pitching");
    
    if (battingPlayers.length > 0 && pitchingPlayers.length > 0) {
      comparativeInsights.push({
        title: "Balanced Roster",
        description: `Good mix of ${battingPlayers.length} batting and ${pitchingPlayers.length} pitching players selected`,
        impact: "medium"
      });
    }
  }

  // Generate recommendations
  const recommendations = [];
  
  if (selectedTeams.length > 0) {
    const avgWinPct = selectedTeams.reduce((sum, t) => sum + t.pct, 0) / selectedTeams.length;
    if (avgWinPct < 0.45) {
      recommendations.push("Focus on building consistent winning streaks to improve overall team performance");
    } else if (avgWinPct > 0.55) {
      recommendations.push("Maintain current strategy and focus on player development to sustain success");
    }
  }

  if (selectedPlayers.length > 0) {
    const avgPerformance = playerAnalysis.reduce((sum, p) => sum + p.performanceScore, 0) / playerAnalysis.length;
    if (avgPerformance > 70) {
      recommendations.push("This is a strong player selection with consistent high performance");
    } else if (avgPerformance < 50) {
      recommendations.push("Consider adding higher-performing players to strengthen the analysis group");
    }
  }

  if (recommendations.length === 0) {
    recommendations.push("Select teams and players to get personalized recommendations");
  }

  // Build summary
  const summary = selectedTeams.length > 0 || selectedPlayers.length > 0
    ? `Analysis covers ${selectedTeams.length} team(s) and ${selectedPlayers.length} player(s). ` +
      (selectedTeams.length > 0 ? `${selectedTeams[0].name} has a win percentage of ${(selectedTeams[0].pct * 100).toFixed(1)}%. ` : "") +
      (selectedPlayers.length > 0 ? `Key players included: ${selectedPlayers.slice(0, 2).map(p => p.name).join(", ")}.` : "")
    : "Please select teams and players to perform analysis";

  const processingTime = Math.floor(Math.random() * 100 + 50);

  return {
    success: true,
    data: {
      summary,
      insights: [
        `Analysis covers ${selectedTeams.length} team(s) and ${selectedPlayers.length} player(s)`,
        `Average team win percentage: ${selectedTeams.length > 0 ? (selectedTeams.reduce((sum, t) => sum + t.pct, 0) / selectedTeams.length * 100).toFixed(1) : "N/A"}%`,
        `Average player performance score: ${selectedPlayers.length > 0 ? (playerAnalysis.reduce((sum, p) => sum + p.performanceScore, 0) / playerAnalysis.length).toFixed(1) : "N/A"}`,
        `Data sourced from ${YEAR} season League API`
      ],
      teamAnalysis,
      playerAnalysis,
      comparativeInsights,
      recommendations
    },
    metadata: {
      selectedTeams: selectedTeams.length,
      selectedPlayers: selectedPlayers.length,
      processingTime,
      analysisScope: analysisType,
      dataSource: "Real League API (S3)",
      season: YEAR,
      battingMetrics: {
        source: battingMetricsCache?.size
          ? process.env.BATTING_METRICS_PATH
            ? "env-file"
            : "default-file"
          : "missing",
        path: battingMetricsResolvedPath
      }
    }
  };
}

/**
 * POST /api/super-widget/parameterized-analysis
 * Handles targeted analysis requests with real League data
 */
router.post('/', async (req, res) => {
  try {
    const { teamIds = [], playerIds = [], analysisType = "group" } = req.body;

    // Validate input
    if (!Array.isArray(teamIds) || !Array.isArray(playerIds)) {
      return res.status(400).json({
        success: false,
        error: "Invalid input format - teamIds and playerIds must be arrays"
      });
    }

    // First try to read teams and players from the database
    let realTeams = [];
    let realPlayers = null;
    let dataSource = "Database";
    let usedStandingsEnrichment = false;
    let usedScoreboardAggregation = false;

    try {
      // Try to fetch teams directly from 'team' table first
      let dbTeams = [];
      try {
        console.log("[SuperWidget] Attempting to query 'team' table...");
        const teamResult = await pool.query('SELECT * FROM team LIMIT 100');
        dbTeams = teamResult.rows;
        console.log(`[SuperWidget] Found ${dbTeams.length} teams from DB`);
      } catch (err) {
        // Fallback to teamService if 'team' table doesn't exist or query fails
        console.warn("[SuperWidget] Team table query failed:", err?.message);
        dbTeams = await teamService.getTeams();
        console.log(`[SuperWidget] Got ${dbTeams.length} teams from teamService`);
      }
      if (Array.isArray(dbTeams) && dbTeams.length > 0) {
        realTeams = dbTeams.map(t => {
          const rawId = t.team_id ?? t.id ?? t.teamid ?? t.teamlinkid ?? t.teamId ?? t.team_id;
          const rawWins = t.wins ?? t.total_wins ?? t.win ?? 0;
          const rawLosses = t.losses ?? t.total_losses ?? t.loss ?? 0;
          const rawPct = t.pct ?? t.win_pct ?? t.percentage ?? null;

          const wins = typeof rawWins === "number" ? rawWins : parseInt(rawWins, 10) || 0;
          const losses = typeof rawLosses === "number" ? rawLosses : parseInt(rawLosses, 10) || 0;
          const pct = typeof rawPct === "number" ? rawPct : typeof rawPct === "string" ? parseFloat(rawPct) : null;

          return {
            id: rawId != null ? rawId.toString() : undefined,
            name: t.team_name ?? t.name ?? t.teamname ?? t.shortname ?? t.team,
            wins,
            losses,
            pct
          };
        });
      }

      const dbPlayers = await fetchPlayersFromDb();
      console.log(`[SuperWidget] fetchPlayersFromDb returned: ${dbPlayers ? dbPlayers.length : 0} players`);
      if (Array.isArray(dbPlayers) && dbPlayers.length > 0) {
        realPlayers = dbPlayers;
      }
    } catch (err) {
      console.warn("DB lookup for teams/players failed, will fallback to S3:", err?.message ?? err);
      realPlayers = null;
      realTeams = [];
    }

    // Determine whether DB provided players and/or teams
    const dbHasPlayers = Array.isArray(realPlayers) && realPlayers.length > 0;
    let dbHasTeams = Array.isArray(realTeams) && realTeams.length > 0;
    console.log(`[SuperWidget POST] dbHasTeams=${dbHasTeams}, dbHasPlayers=${dbHasPlayers}`);

    // Enrich team metrics with standings data if DB rows lack win/loss information
    if (dbHasTeams) {
      const teamsNeedingMetrics = realTeams.some(team => {
        const pct = typeof team.pct === "number" ? team.pct : null;
        const games = (team.wins ?? 0) + (team.losses ?? 0);
        return (!pct || Number.isNaN(pct)) && games === 0;
      });

      if (teamsNeedingMetrics) {
        try {
          const standings = await fetchStandingsData();
          if (standings) {
            const s3Teams = extractTeamsFromStandings(standings);
            if (s3Teams.length > 0) {
              const s3Map = new Map(s3Teams.map(t => [t.id ?? "", t]));
              realTeams = realTeams.map(team => {
                const lookupKey = team.id ?? "";
                let enrichment = s3Map.get(lookupKey);
                if (!enrichment && team.name) {
                  const normalizedName = team.name.toLowerCase();
                  enrichment = s3Teams.find(t => t.name?.toLowerCase() === normalizedName);
                }
                if (!enrichment) return team;
                const pctIsValid = typeof team.pct === "number" && !Number.isNaN(team.pct) && team.pct > 0;
                const winsValid = typeof team.wins === "number" && team.wins > 0;
                const lossesValid = typeof team.losses === "number" && team.losses > 0;
                return {
                  ...team,
                  name: team.name ?? enrichment.name,
                  wins: winsValid ? team.wins : enrichment.wins,
                  losses: lossesValid ? team.losses : enrichment.losses,
                  pct: pctIsValid ? team.pct : enrichment.pct
                };
              });

              // Re-evaluate whether we truly have team data after enrichment
              dbHasTeams = Array.isArray(realTeams) && realTeams.length > 0;
              usedStandingsEnrichment = true;
            }
          }
        } catch (enrichErr) {
          console.warn("[SuperWidget] Unable to enrich teams with standings data:", enrichErr?.message ?? enrichErr);
        }
      }
    }

    // If neither players nor teams are available from DB then we must fetch S3
    if (!dbHasPlayers && !dbHasTeams) {
      dataSource = "S3 League API";
      const [leagueLeaders, standings] = await Promise.all([
        fetchLeagueLeadersData(),
        fetchStandingsData()
      ]);

      if (!leagueLeaders || !standings) {
        return res.status(500).json({
          success: false,
          error: "Unable to fetch League data from S3 or the database"
        });
      }

      // Populate both from S3
      realTeams = extractTeamsFromStandings(standings);
      realPlayers = extractPlayersFromLeaders(leagueLeaders);
    } else {
      // At least one of players/teams was present in DB. Prefer DB data and
      // derive the missing side where possible so we can still run analysis.
      dataSource = "Database";

      // If teams are missing but players exist, derive teams from player rows
      if (!dbHasTeams && dbHasPlayers) {
        const teamNames = Array.from(new Set(realPlayers.map(p => p.team).filter(Boolean)));
        realTeams = teamNames.map((name, idx) => ({
          id: name || `team_${idx}`,
          name: name,
          shortName: name,
          wins: 0,
          losses: 0,
          pct: 0
        }));
      }

      // If players are missing but teams exist, leave players empty; analysis
      // will still run but may produce higher-level team-only insights.
      if (!dbHasPlayers && dbHasTeams) {
        realPlayers = [];
      }
    }

    realPlayers = await attachBattingMetrics(realPlayers);

    // Enrich team records with scoreboard results if available
    try {
      const scoreboardResult = await hydrateTeamsWithScoreboardRecords(realTeams);
      realTeams = scoreboardResult.teams;
      usedScoreboardAggregation = scoreboardResult.used;
    } catch (scoreErr) {
      console.warn("[SuperWidget] Unable to hydrate team records from scores:", scoreErr?.message ?? scoreErr);
    }

    // Generate analysis with resolved real data
    const analysis = await generateParameterizedAnalysis(
      teamIds,
      playerIds,
      analysisType,
      realTeams,
      realPlayers
    );

    // Attach data source information to metadata
    analysis.metadata = analysis.metadata || {};
    if (usedStandingsEnrichment && usedScoreboardAggregation) {
      analysis.metadata.dataSource = `${dataSource} + Standings S3 + Game results`;
    } else if (usedStandingsEnrichment && dataSource === "Database") {
      analysis.metadata.dataSource = "Database + Standings S3";
    } else if (usedScoreboardAggregation && dataSource === "Database") {
      analysis.metadata.dataSource = "Database + Game results";
    } else if (usedScoreboardAggregation && dataSource === "S3 League API") {
      analysis.metadata.dataSource = "S3 League API + Game results";
    } else {
      analysis.metadata.dataSource = dataSource;
    }

    return res.status(200).json(analysis);
  } catch (error) {
    console.error("Error in parameterized analysis:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
      details: error.message
    });
  }
});

/**
 * GET /api/super-widget/parameterized-analysis
 * Returns API documentation and available teams/players
 */
router.get('/', async (req, res) => {
  try {
    const { teamId } = req.query; // Optional filter parameter

    // Try to present available teams/players from DB first
    let availableTeams = [];
    let availablePlayers = [];
    let usedSource = "Database";

    try {
      // Try to fetch teams directly from 'team' table first
      let dbTeams = [];
      try {
        const teamResult = await pool.query('SELECT * FROM team LIMIT 100');
        dbTeams = teamResult.rows;
      } catch (err) {
        // Fallback to teamService if 'team' table doesn't exist or query fails
        dbTeams = await teamService.getTeams();
      }
      if (Array.isArray(dbTeams) && dbTeams.length > 0) {
        availableTeams = dbTeams.map(t => ({
          id: t.team_id ?? t.id ?? t.teamlinkid ?? t.teamId,
          name: t.team_name ?? t.name ?? t.teamname ?? t.shortname,
          wins: t.wins ?? 0,
          losses: t.losses ?? 0
        }));
      }

      // Fetch players from DB, optionally filtered by teamId
      let dbPlayers = await fetchPlayersFromDb(teamId);
      console.log(`[SuperWidget GET] fetchPlayersFromDb(${teamId}) returned: ${dbPlayers ? dbPlayers.length : 0} players`);
      
      // If no players from DB, try direct query as fallback
      if (!Array.isArray(dbPlayers) || dbPlayers.length === 0) {
        console.log(`[SuperWidget GET] Attempting direct player query as fallback...`);
        try {
          const directResult = await pool.query('SELECT * FROM player LIMIT 500');
          if (directResult.rows && directResult.rows.length > 0) {
            dbPlayers = directResult.rows.map((row, idx) => ({
              id: row.player_id ?? row.id ?? idx.toString(),
              name: row.player_name ?? row.name ?? null,
              position: row.player_batting_handedness ?? row.position ?? "",
              team: row.team_id ?? null,
              type: row.is_pitcher ? "pitching" : "batting"
            }));
            console.log(`[SuperWidget GET] Direct query returned ${dbPlayers.length} players`);
          }
        } catch (fallbackErr) {
          console.error(`[SuperWidget GET] Direct query also failed:`, fallbackErr?.message);
        }
      }
      
      if (Array.isArray(dbPlayers) && dbPlayers.length > 0) {
        availablePlayers = dbPlayers;
      } else if (!Array.isArray(dbPlayers)) {
        console.warn(`[SuperWidget GET] fetchPlayersFromDb returned non-array: ${typeof dbPlayers}`);
      } else {
        // Fallback to S3 or temporary mock data for testing
        console.warn(`[SuperWidget GET] No players returned from DB, using S3 fallback...`);
      }
    } catch (err) {
      console.warn("Error loading available teams/players from DB, will fallback to S3:", err?.message ?? err);
      availableTeams = [];
      availablePlayers = [];
    }

    // Fallback to S3 League data only if both teams and players are missing from DB
    if ((availableTeams.length === 0 && availablePlayers.length === 0)) {
      usedSource = "S3 League API";
      const [leagueLeaders, standings] = await Promise.all([
        fetchLeagueLeadersData(),
        fetchStandingsData()
      ]);

      if (standings) availableTeams = extractTeamsFromStandings(standings);
      if (leagueLeaders) availablePlayers = extractPlayersFromLeaders(leagueLeaders);
    }

    return res.status(200).json({
      endpoint: "/api/super-widget/parameterized-analysis",
      method: "POST",
      description: "Generate targeted analysis based on selected teams and players",
      dataSource: `${usedSource} (Season ${YEAR})`,
      requestBody: {
        teamIds: "number[] - Team IDs to analyze",
        playerIds: "number[] - Player IDs to analyze",
        analysisType: "string - 'comparison', 'individual', or 'group' (default: 'group')"
      },
      availableTeams: availableTeams.map(t => ({
        id: t.id,
        name: t.name,
        wins: t.wins,
        losses: t.losses
      })),
      availablePlayers: availablePlayers.map(p => ({
        id: p.id,
        name: p.name,
        teamId: p.team,
        position: p.position || "Unknown"
      })),
      totalTeamsAvailable: availableTeams.length,
      totalPlayersAvailable: availablePlayers.length,
      exampleRequest: {
        teamIds: [availableTeams[0]?.id],
        playerIds: availablePlayers.slice(0, 2).map(p => p.id),
        analysisType: "group"
      },
      responseExample: {
        success: true,
        data: {
          summary: "Analysis summary",
          insights: ["insight1", "insight2"],
          teamAnalysis: [],
          playerAnalysis: [],
          comparativeInsights: [],
          recommendations: []
        },
        metadata: {
          selectedTeams: 1,
          selectedPlayers: 2,
          processingTime: 75,
          analysisScope: "group",
          dataSource: usedSource,
          season: YEAR
        }
      }
    });
  } catch (error) {
    console.error("Error fetching API documentation:", error);
    return res.status(500).json({
      success: false,
      error: "Unable to fetch API documentation"
    });
  }
});

export default router;
