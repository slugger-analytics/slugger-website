"use strict";
/**
 * update_standings (AWS Lambda) — iScore.
 *
 * Fetches league standings from the iScore public API and writes two files to S3:
 *   standings/{year}-standings.json            — full-season cumulative standings
 *   standings/{year}-first-half-standings.json — first-half standings (when SECOND_HALF_START is set)
 *
 * Clinched playoff spots are computed automatically:
 *   - Once the first half ends, the first-half division winner in each division is clinched.
 *   - During the second half, a team is clinched when no challenger in their division can
 *     mathematically reach their second-half win total.
 *   - If the same team wins both halves, the second-place second-half team in that division
 *     earns the playoff spot instead (marked as clinched in their place).
 *
 * Env vars:
 *   BASE_URL              iScore public base (default: https://api.microservices.iscoresports.com/api/public)
 *   SEASON_ID             iScore season GUID
 *   LEAGUE_ID             iScore league GUID (df9fb9cc-0fdb-4b79-8a3c-ad5d7b415a56 for ALPB)
 *   SEASON_YEAR           e.g. "2026"
 *   STANDINGS_BUCKET_NAME S3 bucket (e.g. alpb-jsondata)
 *   SECOND_HALF_START     ISO date string when second half begins (e.g. "2026-07-03T00:00:00Z")
 *                         If unset, first-half standings and clinch computation are skipped.
 *   HALF_GAMES            Games per team per half (default: 63)
 */
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({});

const BASE_URL = (process.env.BASE_URL || "https://api.microservices.iscoresports.com/api/public").replace(/\/+$/, "");
const API_ROOT = BASE_URL.replace(/\/public$/, "");

// ALPB division membership (team names as returned by iScore).
const DIVISIONS = {
  North: ["Hagerstown Flying Boxcars", "Lancaster Stormers", "Long Island Ducks", "York Revolution", "Staten Island Ferry Hawks"],
  South: ["Southern Maryland Blue Crabs", "High Point Rockers", "Lexington Legends", "Gastonia Ghost Peppers", "Charleston Dirty Birds"],
};

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
  return (Math.round((w / g) * 1000) / 1000).toFixed(3);
}

// Fetch scores for a list of games, CONCURRENCY at a time.
async function fetchGameScores(games, concurrency = 15) {
  const results = new Map();
  for (let i = 0; i < games.length; i += concurrency) {
    const batch = games.slice(i, i + concurrency);
    const settled = await Promise.allSettled(
      batch.map((g) => fetchJson(`${API_ROOT}/games/${g.gameGuid}/latest-score/internal`))
    );
    for (let j = 0; j < batch.length; j++) {
      const game = batch[j];
      const result = settled[j];
      if (result.status !== "fulfilled") { results.set(game.gameGuid, null); continue; }
      const data = result.value;
      const home = data.teams?.HOME?.runs ?? null;
      const away = data.teams?.AWAY?.runs ?? null;
      results.set(game.gameGuid, home !== null && away !== null ? { homeRuns: home, awayRuns: away } : null);
    }
  }
  return results;
}

// Build team-id → { name, shortName } lookup from the iScore standings response.
function buildTeamLookup(standingsResp) {
  const lookup = new Map();
  for (const t of standingsResp.teams || []) {
    lookup.set(String(t.teamId ?? t.id ?? ""), {
      name: String(t.name ?? ""),
      shortName: String(t.shortName ?? ""),
    });
  }
  return lookup;
}

// Build full-season W-L map from the iScore aggregated standings response.
function buildFullRecords(standingsResp) {
  const wins = new Map();
  const losses = new Map();
  for (const t of standingsResp.teams || []) {
    const id = String(t.teamId ?? t.id ?? "");
    wins.set(id, Number(t.W ?? 0));
    losses.set(id, Number(t.L ?? 0));
  }
  return { wins, losses };
}

// Tally W-L-RS-RA from a list of games using a pre-fetched score map.
function tallyRecords(games, scoreMap) {
  const wins = new Map();
  const losses = new Map();
  const rs = new Map();
  const ra = new Map();
  const inc = (map, id, n = 1) => map.set(id, (map.get(id) ?? 0) + n);
  for (const g of games) {
    const score = scoreMap.get(g.gameGuid);
    if (!score) continue;
    const { homeRuns, awayRuns } = score;
    if (homeRuns === awayRuns) continue;
    const homeId = String(g.homeTeam?.id ?? "");
    const awayId = String(g.awayTeam?.id ?? "");
    if (homeRuns > awayRuns) { inc(wins, homeId); inc(losses, awayId); }
    else                     { inc(wins, awayId); inc(losses, homeId); }
    inc(rs, homeId, homeRuns); inc(ra, homeId, awayRuns);
    inc(rs, awayId, awayRuns); inc(ra, awayId, homeRuns);
  }
  return { wins, losses, rs, ra };
}

/**
 * Determine which teams have clinched a playoff spot.
 *
 * Rules:
 *  1. Once the first half has ended, the first-half division winner in each division is clinched.
 *  2. A team also clinches the second half when no other team in their division can reach
 *     their second-half win total given remaining games.
 *  3. If the same team wins both halves of a division, the runner-up (best second-half record
 *     in that division) earns the second playoff spot instead.
 */
function computeClinched(h1Records, fullRecords, teamLookup, secondHalfStart, halfGames) {
  const now = new Date();
  const firstHalfOver = secondHalfStart && now >= new Date(secondHalfStart);
  if (!firstHalfOver) return [];

  // Helper: find which division a team belongs to by name.
  const divOf = (name) => {
    for (const [div, members] of Object.entries(DIVISIONS)) {
      if (members.includes(name)) return div;
    }
    return null;
  };

  // Build per-team stats for both halves, keyed by team name.
  const byName = new Map();
  for (const [id, info] of teamLookup) {
    const div = divOf(info.name);
    if (!div) continue;
    const h1W = h1Records.wins.get(id) ?? 0;
    const h1L = h1Records.losses.get(id) ?? 0;
    const fullW = fullRecords.wins.get(id) ?? 0;
    const fullL = fullRecords.losses.get(id) ?? 0;
    const h2W = Math.max(0, fullW - h1W);
    const h2L = Math.max(0, fullL - h1L);
    const h2Remaining = Math.max(0, halfGames - h2W - h2L);
    byName.set(info.name, { id, name: info.name, div, h1W, h1L, h2W, h2L, h2Remaining });
  }

  const allTeams = [...byName.values()];
  const clinched = new Set();

  for (const divName of Object.keys(DIVISIONS)) {
    const divTeams = allTeams.filter((t) => t.div === divName);
    if (divTeams.length === 0) continue;

    // ── First-half winner ────────────────────────────────────────────────────
    const h1Sorted = [...divTeams].sort((a, b) => b.h1W - a.h1W || a.h1L - b.h1L);
    const h1Winner = h1Sorted[0];

    // ── Second-half leader and clinch check ──────────────────────────────────
    const h2Sorted = [...divTeams].sort((a, b) => b.h2W - a.h2W || a.h2L - b.h2L);
    const h2Leader = h2Sorted[0];

    // Leader clinches second half when no challenger can match their wins.
    const h2LeaderClinched = h2Sorted.slice(1).every(
      (ch) => h2Leader.h2W > ch.h2W + ch.h2Remaining
    );

    // If the first-half winner also leads the second half and has clinched it,
    // the runner-up (h2Sorted[1]) earns the second playoff spot.
    if (h2LeaderClinched && h2Leader.name === h1Winner.name) {
      clinched.add(h1Winner.name);
      if (h2Sorted.length > 1) clinched.add(h2Sorted[1].name);
    } else {
      // First-half winner always holds their playoff spot.
      clinched.add(h1Winner.name);
      // Second-half leader is clinched only when mathematically locked in.
      if (h2LeaderClinched) clinched.add(h2Leader.name);
    }
  }

  console.log("update_standings: computed clinched teams:", [...clinched]);
  return [...clinched];
}

// Build the SLUGGER standings payload from computed W-L records.
function recordsToPayload(records, teamLookup, year, clinched) {
  const { wins, losses, rs, ra } = records;
  const allIds = new Set([...wins.keys(), ...losses.keys()]);
  const team = [...allIds].map((id) => {
    const info = teamLookup.get(id) ?? { name: id, shortName: "" };
    const w = wins.get(id) ?? 0;
    const l = losses.get(id) ?? 0;
    return {
      teamname: info.name,
      shortName: info.shortName,
      teamId: id,
      wins: String(w),
      losses: String(l),
      pct: pct(w, l),
      gp: String(w + l),
      rs: String(rs.get(id) ?? 0),
      ra: String(ra.get(id) ?? 0),
      streak: "",
      last10: "",
    };
  });
  return {
    standings: { conference: [{ name: "OVERALL", division: [{ name: "Atlantic League", team }] }] },
    year: String(year),
    updatedAt: new Date().toISOString(),
    clinched: clinched.map(String),
  };
}

// Map the iScore aggregated standings response to the SLUGGER JSON shape.
function toStandingsPayload(standingsResp, year, clinched = []) {
  const teams = (standingsResp && standingsResp.teams) || [];
  const team = teams.map((t) => {
    const w = Number(t.W ?? t.w ?? t.wins ?? 0);
    const l = Number(t.L ?? t.l ?? t.losses ?? 0);
    const ties = Number(t.T ?? t.t ?? t.ties ?? 0);
    const gp = Number(t.GP ?? t.gp ?? w + l + ties);
    return {
      teamname: String(t.name ?? t.teamName ?? ""),
      shortName: String(t.shortName ?? t.shortname ?? ""),
      teamId: String(t.teamId ?? t.id ?? ""),
      wins: String(w),
      losses: String(l),
      pct: pct(w, l),
      gp: String(gp),
      rs: String(Number(t.RS ?? t.rs ?? 0)),
      ra: String(Number(t.RA ?? t.ra ?? 0)),
      streak: "",
      last10: "",
    };
  });
  return {
    standings: { conference: [{ name: "OVERALL", division: [{ name: "Atlantic League", team }] }] },
    year: String(year),
    updatedAt: new Date().toISOString(),
    clinched: clinched.map(String),
  };
}

async function putS3(bucket, key, payload) {
  await s3.send(new PutObjectCommand({
    Bucket: bucket, Key: key,
    Body: JSON.stringify(payload),
    ContentType: "application/json",
    CacheControl: "no-cache",
  }));
  console.log(`update_standings: wrote ${bucket}/${key} (${payload.standings.conference[0].division[0].team.length} teams, clinched: [${payload.clinched.join(", ")}])`);
}

const handler = async (event = {}) => {
  try {
    const seasonId       = String(event.seasonId || "").trim() || reqEnv("SEASON_ID");
    const leagueId       = String(event.leagueId || "").trim() || process.env.LEAGUE_ID || "";
    const year           = String(event.year || process.env.SEASON_YEAR || new Date().getFullYear());
    const bucket         = reqEnv("STANDINGS_BUCKET_NAME");
    const secondHalfStart = String(event.secondHalfStart || process.env.SECOND_HALF_START || "").trim();
    const halfGames      = Number(process.env.HALF_GAMES || 63);

    // ── Full-season standings ────────────────────────────────────────────────
    const standingsResp = await fetchJson(`${API_ROOT}/leagues/standings?seasonId=${seasonId}`);
    const teamLookup = buildTeamLookup(standingsResp);
    const fullRecords = buildFullRecords(standingsResp);

    if (!secondHalfStart || !leagueId) {
      // No split-season config — just write full standings with no clinch data.
      await putS3(bucket, `standings/${year}-standings.json`, toStandingsPayload(standingsResp, year, []));
      if (!secondHalfStart) console.log("update_standings: SECOND_HALF_START not set, skipping split-season logic");
      if (!leagueId)        console.log("update_standings: LEAGUE_ID not set, skipping split-season logic");
      return { statusCode: 200, body: { success: true, message: `Updated standings for ${year}` } };
    }

    // ── Fetch all completed games and split into halves ──────────────────────
    const seasonStart = `${year}-01-01T00:00:00.000Z`;
    const seasonEnd   = `${year}-12-31T23:59:59.999Z`;
    const allGamesRaw = await fetchJson(
      `${API_ROOT}/public/games?leagueId=${leagueId}&gameStatusId=3&startDateFrom=${seasonStart}&startDateTo=${seasonEnd}&take=1000`
    );
    const allGames = (Array.isArray(allGamesRaw) ? allGamesRaw : (allGamesRaw.items ?? []))
      .filter((g) => (g.season?.id ?? g.seasonId) === seasonId);

    const firstHalfGames  = allGames.filter((g) => g.scheduledDate <  secondHalfStart);
    const secondHalfGames = allGames.filter((g) => g.scheduledDate >= secondHalfStart);

    console.log(`update_standings: ${allGames.length} games total — ${firstHalfGames.length} H1, ${secondHalfGames.length} H2`);

    // ── Fetch all game scores in parallel batches ────────────────────────────
    const allScoreMap = await fetchGameScores(allGames);

    // ── First-half records (from game results) ───────────────────────────────
    const h1Records = tallyRecords(firstHalfGames, allScoreMap);

    // ── Compute clinched teams ───────────────────────────────────────────────
    const clinched = computeClinched(h1Records, fullRecords, teamLookup, secondHalfStart, halfGames);

    // ── Write full-season standings ──────────────────────────────────────────
    await putS3(bucket, `standings/${year}-standings.json`, toStandingsPayload(standingsResp, year, clinched));

    // ── Write first-half standings ───────────────────────────────────────────
    if (firstHalfGames.length > 0) {
      const firstHalfPayload = recordsToPayload(h1Records, teamLookup, year, clinched);
      await putS3(bucket, `standings/${year}-first-half-standings.json`, firstHalfPayload);
    }

    return { statusCode: 200, body: { success: true, message: `Updated standings for ${year}`, clinched } };
  } catch (err) {
    console.error("update_standings error:", err);
    return { statusCode: 500, body: { success: false, message: String((err && err.message) || err) } };
  }
};

module.exports = { handler, toStandingsPayload, pct };
