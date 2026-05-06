/* eslint-disable no-console */
/**
 * update_league_leaders (AWS Lambda)
 *
 * Pulls league leaderboards from iScore microservices API and writes a
 * `league-leaders/{year}-league-leaders.json` object to S3.
 *
 * Output shape matches `frontend/src/data/types.ts` `LeagueLeadersData`.
 */

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({});

const ISCORE_BASE_URL =
  process.env.ISCORE_BASE_URL?.trim() ||
  "https://api.microservices.iscoresports.com/api/api";

function requiredEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`[update_league_leaders] Missing env var: ${name}`);
  return String(v).trim();
}

function toInningsFromOuts(outs) {
  const o = Number(outs) || 0;
  const whole = Math.floor(o / 3);
  const rem = o % 3;
  return `${whole}.${rem}`; // baseball-style innings (e.g., 17.2)
}

function fmtAvg(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "0.000";
  return n.toFixed(3);
}

function fmtEra(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "slugger-update-league-leaders/1.0", Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[update_league_leaders] iScore ${res.status} for ${url}: ${body.slice(0, 500)}`);
  }
  return res.json();
}

function buildUrl(path, params) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    usp.set(k, String(v));
  }
  return `${ISCORE_BASE_URL}${path}?${usp.toString()}`;
}

function teamNameObj(teamId, teamName) {
  const id = teamId ? String(teamId) : "";
  const name = teamName ? String(teamName) : "";
  return {
    id,
    teamlinkid: "",
    teamid: id,
    fullname: name,
    $t: name,
  };
}

function batterRow(item, sbByPlayerId) {
  const stats = item.stats || {};
  const rates = stats.RATES || {};
  const playerId = String(item.playerId || "");
  const first = String(item.firstName || "").trim();
  const last = String(item.lastName || "").trim();
  const fullName = `${first} ${last}`.trim() || String(item.playerName || "").trim();
  const sb = sbByPlayerId.get(playerId) ?? 0;

  return {
    playerlinkid: "",
    playerid: playerId,
    jersey: "",
    playername: fullName,
    firstname: first,
    lastname: last,
    teamname: teamNameObj(item.teamId, item.teamName),
    position: "",
    ab: String(stats.AB ?? 0),
    runs: String(stats.R ?? 0),
    hits: String(stats.H ?? 0),
    bib: String(stats["2B"] ?? 0),
    trib: String(stats["3B"] ?? 0),
    hr: String(stats.HR ?? 0),
    rbi: String(stats.RBI ?? 0),
    bb: String(stats.BB ?? 0),
    hp: String(stats.HBP ?? 0),
    so: String(stats.SO ?? 0),
    sf: String(stats.SF ?? 0),
    sb: String(sb),
    dp: String(stats.DP ?? stats.GIDP ?? 0),
    obp: String(Number(rates.OBP ?? 0).toFixed(3)),
    slg: String(Number(rates.SLG ?? 0).toFixed(3)),
    avg: fmtAvg(rates.AVG),
  };
}

function pitcherRow(item) {
  const stats = item.stats || {};
  const rates = stats.RATES || {};
  const playerId = String(item.playerId || "");
  const first = String(item.firstName || "").trim();
  const last = String(item.lastName || "").trim();
  const fullName = `${first} ${last}`.trim() || String(item.playerName || "").trim();

  return {
    playerlinkid: "",
    playerid: playerId,
    jersey: "",
    playername: fullName,
    firstname: first,
    lastname: last,
    teamname: teamNameObj(item.teamId, item.teamName),
    wins: String(stats.W ?? 0),
    losses: String(stats.L ?? 0),
    ip: toInningsFromOuts(stats.OUTS_PITCHED ?? 0),
    runs: String(stats.R ?? 0),
    er: String(stats.ER ?? 0),
    hits: String(stats.H ?? 0),
    bb: String(stats.BB ?? 0),
    so: String(stats.SO ?? 0),
    bf: String(stats.BF ?? 0),
    games: String(stats.G ?? 0),
    gs: String(stats.GS ?? 0),
    cg: String(stats.CG ?? 0),
    cgl: String(stats.CGL ?? 0),
    sho: String(stats.SHO ?? 0),
    sv: String(stats.SV ?? 0),
    bsv: String(stats.BS ?? 0),
    oobp: String(stats.OOBP ?? 0),
    oslg: String(stats.OSLG ?? 0),
    oavg: String(stats.OAVG ?? 0),
    era: fmtEra(rates.ERA),
  };
}

exports.handler = async (event = {}) => {
  const BUCKET_NAME = requiredEnv("JSON_BUCKET_NAME");

  const year = String(event.year || "").trim() || String(new Date().getFullYear());
  const seasonId =
    String(event.iscoreSeasonId || event.seasonId || event.seasonid || "").trim() ||
    requiredEnv("ISCORE_SEASON_ID");
  const leagueId =
    String(event.iscoreLeagueId || event.leagueId || event.leagueid || "").trim() ||
    requiredEnv("ISCORE_LEAGUE_ID");

  const size = Number(event.size || process.env.ISCORE_LEADERBOARD_SIZE || 200);

  const battingUrl = buildUrl("/leaderboard/player/batting", {
    seasonId,
    leagueId,
    sortBy: "AVG",
    sortDir: "desc",
    size,
  });
  const runningUrl = buildUrl("/leaderboard/player/running", {
    seasonId,
    leagueId,
    sortBy: "SB",
    sortDir: "desc",
    size,
  });
  const pitchingUrl = buildUrl("/leaderboard/player/pitching", {
    seasonId,
    leagueId,
    sortBy: "ERA",
    sortDir: "asc",
    size,
  });

  console.info("[update_league_leaders] fetching", { year, seasonId, leagueId, size });

  const [batting, running, pitching] = await Promise.all([
    fetchJson(battingUrl),
    fetchJson(runningUrl),
    fetchJson(pitchingUrl),
  ]);

  const sbByPlayerId = new Map();
  for (const item of running.items || []) {
    const pid = String(item.playerId || "");
    if (!pid) continue;
    sbByPlayerId.set(pid, Number(item.stats?.SB ?? 0));
  }

  const battingPlayers = (batting.items || []).map((it) => batterRow(it, sbByPlayerId));
  const pitchingPlayers = (pitching.items || []).map((it) => pitcherRow(it));

  const payload = {
    updatedAt: new Date().toISOString(),
    year: String(year),
    stats: {
      link: "iscore",
      season: String(seasonId),
      pitching: { player: pitchingPlayers },
      batting: { player: battingPlayers },
    },
  };

  const key = `league-leaders/${year}-league-leaders.json`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(payload),
      ContentType: "application/json",
      CacheControl: "no-cache",
    }),
  );

  console.info("[update_league_leaders] wrote", { bucket: BUCKET_NAME, key, bytes: JSON.stringify(payload).length });

  return {
    success: true,
    message: "Updated league leaders.",
    key,
    year: String(year),
  };
};

