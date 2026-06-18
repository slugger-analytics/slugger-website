"use strict";
/**
 * update_standings (AWS Lambda) — iScore.
 *
 * Fetches league standings from the iScore public API and writes
 * `standings/{year}-standings.json` to S3 in the shape the SLUGGER frontend
 * expects (matches the existing `2026-standings.json`):
 *
 *   { standings: { conference: [ { name: "OVERALL",
 *       division: [ { name: "Atlantic League", team: [ {teamname, shortName,
 *         teamId, wins, losses, pct, gp, rs, ra, streak, last10} ] } ] } ] },
 *     year, updatedAt }
 *
 * Env vars (match the live Lambda):
 *   BASE_URL              iScore public base, e.g. https://api.microservices.iscoresports.com/api/public
 *   SEASON_ID             iScore season GUID (league is resolved from the season)
 *   SEASON_YEAR           e.g. "2026"
 *   STANDINGS_BUCKET_NAME S3 bucket (e.g. alpb-jsondata)
 *   LEAGUE_ID  (optional) iScore league GUID; if unset it is derived from the season
 *
 * iScore endpoints used:
 *   GET {BASE_URL}/seasons/{seasonId}            -> season details (carries leagueGuid)
 *   GET {apiRoot}/leagues/{leagueId}/standings   -> { leagueId, teams:[{teamId,name,shortName,w,l,t,rs,ra,gp}] }
 * where apiRoot = BASE_URL without the trailing "/public".
 */
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({});

const BASE_URL = (process.env.BASE_URL || "https://api.microservices.iscoresports.com/api/public").replace(/\/+$/, "");
const API_ROOT = BASE_URL.replace(/\/public$/, "");

function reqEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`update_standings: missing env var ${name}`);
  return String(v).trim();
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "slugger-update-standings/1.0", Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`update_standings: iScore ${res.status} for ${url}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

function pct(w, l) {
  const g = w + l;
  if (g <= 0) return "0.000";
  // round half up at 3 decimals to match the existing standings file
  return (Math.round((w / g) * 1000) / 1000).toFixed(3);
}

// Map the iScore league-standings response to the SLUGGER standings JSON.
function toStandingsPayload(standingsResp, year) {
  const teams = (standingsResp && standingsResp.teams) || [];
  const team = teams.map((t) => {
    const w = Number(t.w ?? t.wins ?? 0);
    const l = Number(t.l ?? t.losses ?? 0);
    const ties = Number(t.t ?? t.ties ?? 0);
    const gp = Number(t.gp ?? w + l + ties);
    return {
      teamname: String(t.name ?? t.teamName ?? ""),
      shortName: String(t.shortName ?? t.shortname ?? ""),
      teamId: String(t.teamId ?? t.id ?? ""),
      wins: String(w),
      losses: String(l),
      pct: pct(w, l),
      gp: String(gp),
      rs: String(Number(t.rs ?? 0)),
      ra: String(Number(t.ra ?? 0)),
      streak: "",
      last10: "",
    };
  });
  return {
    standings: { conference: [{ name: "OVERALL", division: [{ name: "Atlantic League", team }] }] },
    year: String(year),
    updatedAt: new Date().toISOString(),
  };
}

async function resolveLeagueGuid(seasonId) {
  const season = await fetchJson(`${BASE_URL}/seasons/${seasonId}`);
  const lg = season && (season.leagueGuid || season.leagueId);
  if (!lg) throw new Error("update_standings: could not resolve leagueGuid from season details");
  return String(lg);
}

const handler = async (event = {}) => {
  try {
    const seasonId = String(event.seasonId || "").trim() || reqEnv("SEASON_ID");
    const year = String(event.year || process.env.SEASON_YEAR || new Date().getFullYear());
    const bucket = reqEnv("STANDINGS_BUCKET_NAME");
    const leagueGuid =
      String(event.leagueId || process.env.LEAGUE_ID || "").trim() || (await resolveLeagueGuid(seasonId));

    const standingsResp = await fetchJson(`${API_ROOT}/leagues/${leagueGuid}/standings`);
    const payload = toStandingsPayload(standingsResp, year);

    const key = `standings/${year}-standings.json`;
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: JSON.stringify(payload),
        ContentType: "application/json",
        CacheControl: "no-cache",
      }),
    );
    console.log(`update_standings: wrote ${bucket}/${key} (${payload.standings.conference[0].division[0].team.length} teams)`);
    return {
      statusCode: 200,
      body: { success: true, message: `Updated standings ${bucket}/${key}`, teams: payload.standings.conference[0].division[0].team.length },
    };
  } catch (err) {
    console.error("update_standings error:", err);
    return { statusCode: 500, body: { success: false, message: String((err && err.message) || err) } };
  }
};

module.exports = { handler, toStandingsPayload, pct };
