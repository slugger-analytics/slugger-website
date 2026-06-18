"use strict";
/**
 * update_scoreboard (AWS Lambda) — iScore.
 *
 * Fetches recent/upcoming games for the league from the iScore public API,
 * pulls each game's latest score, and upserts rows into the Aurora `scores`
 * table that the SLUGGER super-widget reads.
 *
 * Env vars (match the live Lambda):
 *   BASE_URL   iScore public base (e.g. https://api.microservices.iscoresports.com/api/public)
 *   LEAGUE_ID  iScore league GUID
 *   DB_HOST    Aurora host. NOTE: the live value is the read-only (`.cluster-ro-`)
 *              endpoint; we rewrite it to the writer endpoint before connecting.
 *   DB_PORT, DB_USER, DB_PASS, DB_NAME
 *
 * iScore endpoints:
 *   GET {BASE_URL}/games?leagueId=&startDateFrom=&startDateTo=   -> game list (no scores)
 *   GET {apiRoot}/games/{gameGuid}/latest-score/internal         -> { teams: { HOME:{runs}, AWAY:{runs} } }
 */
const { Pool } = require("pg");

const BASE_URL = (process.env.BASE_URL || "https://api.microservices.iscoresports.com/api/public").replace(/\/+$/, "");
const API_ROOT = BASE_URL.replace(/\/public$/, "");
const WINDOW_DAYS = Number(process.env.SCOREBOARD_WINDOW_DAYS || 2);

const STATUS_BY_ID = { 1: "SCHEDULED", 2: "LIVE", 3: "FINAL" };
function statusOf(id) {
  return STATUS_BY_ID[Number(id)] || "SCHEDULED";
}

// Never write through the Aurora reader endpoint.
function writerHost(host) {
  const h = String(host || "");
  return h.includes(".cluster-ro-") ? h.replace(".cluster-ro-", ".cluster-") : h;
}

function num(v) {
  return v === null || v === undefined || v === "" ? null : Number(v);
}

function windowDates(now, days = WINDOW_DAYS) {
  const ms = days * 24 * 60 * 60 * 1000;
  return { from: new Date(now.getTime() - ms).toISOString(), to: new Date(now.getTime() + ms).toISOString() };
}

async function fetchJson(url) {
  const r = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "slugger-update-scoreboard/1.0" } });
  if (!r.ok) throw new Error(`update_scoreboard: iScore ${r.status} for ${url}`);
  return r.json();
}

// Returns { home, away } runs, or null if no score is available (e.g. scheduled games).
async function fetchScore(gameGuid) {
  try {
    const r = await fetch(`${API_ROOT}/games/${gameGuid}/latest-score/internal`, { headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    const d = await r.json();
    const t = d && d.teams;
    if (!t) return null;
    return { home: num(t.HOME && t.HOME.runs), away: num(t.AWAY && t.AWAY.runs) };
  } catch {
    return null;
  }
}

// Transform an iScore games array into `scores` upsert rows (one latest-score call per game).
async function buildRows(games) {
  const rows = [];
  for (const g of games || []) {
    const score = await fetchScore(g.gameGuid);
    rows.push({
      game_id: g.gameGuid,
      date: g.scheduledDate || null,
      home_team_name: (g.homeTeam && g.homeTeam.name) || null,
      visiting_team_name: (g.awayTeam && g.awayTeam.name) || null,
      home_team_score: score ? score.home : null,
      visiting_team_score: score ? score.away : null,
      game_status: statusOf(g.gameStatusId),
      field: (g.gameInfo && g.gameInfo.location) || null,
    });
  }
  return rows;
}

const UPSERT = `
INSERT INTO scores (
  game_id, date, home_team_name, visiting_team_name,
  home_team_score, visiting_team_score, game_status, field, last_updated
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
ON CONFLICT (game_id) DO UPDATE SET
  date = EXCLUDED.date,
  home_team_name = EXCLUDED.home_team_name,
  visiting_team_name = EXCLUDED.visiting_team_name,
  home_team_score = EXCLUDED.home_team_score,
  visiting_team_score = EXCLUDED.visiting_team_score,
  game_status = EXCLUDED.game_status,
  field = EXCLUDED.field,
  last_updated = NOW()`;

function rowParams(r) {
  return [r.game_id, r.date, r.home_team_name, r.visiting_team_name, r.home_team_score, r.visiting_team_score, r.game_status, r.field];
}

const handler = async (event = {}) => {
  const leagueId = String(event.leagueId || process.env.LEAGUE_ID || "").trim();
  if (!leagueId) throw new Error("update_scoreboard: missing LEAGUE_ID");
  const now = event.now ? new Date(event.now) : new Date();
  const { from, to } = windowDates(now);
  const url = `${BASE_URL}/games?leagueId=${leagueId}&startDateFrom=${from}&startDateTo=${to}`;
  console.log("Fetching games:", url);
  const games = await fetchJson(url);
  const rows = await buildRows(games);

  const pool = new Pool({
    host: writerHost(process.env.DB_HOST),
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 15000,
  });

  let processed = 0;
  try {
    const client = await pool.connect();
    try {
      for (const r of rows) {
        await client.query(UPSERT, rowParams(r));
        processed += 1;
      }
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }

  console.log(`Scoreboard update complete: ${processed} games processed`);
  return { statusCode: 200, body: { success: true, processed } };
};

module.exports = { handler, buildRows, rowParams, statusOf, writerHost, windowDates, num, UPSERT };
