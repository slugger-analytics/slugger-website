"use strict";
/**
 * TDD coverage for update_league_leaders (iScore).
 * Zero-touch: mocks global.fetch + the S3 client, asserts the transform
 * invariants deterministically and runs a contract test against real
 * iScore leaderboard fixtures captured in ./fixtures.
 */
const { test, mock } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

// env must be set before requiring index.js (ISCORE_BASE_URL is read at load)
process.env.JSON_BUCKET_NAME = "test-bucket";
process.env.ISCORE_BASE_URL = "https://mock.iscore/api";
process.env.ISCORE_SEASON_ID = "season-xyz";
process.env.ISCORE_LEAGUE_ID = "league-xyz";
process.env.ISCORE_LEADERBOARD_SIZE = "200";

const s3lib = require("@aws-sdk/client-s3");
const { GetObjectCommand, PutObjectCommand } = s3lib;
const mod = require("../index.js");

async function* chunks(str) {
  yield Buffer.from(str, "utf8");
}

function standingsBody(teams) {
  return JSON.stringify({
    standings: { conference: [{ name: "OVERALL", division: [{ name: "AL", team: teams }] }] },
    year: "2026",
  });
}

// Replaces S3Client.prototype.send: GetObject -> standings stream, PutObject -> capture.
function installS3(capture, standingsJson) {
  mock.method(s3lib.S3Client.prototype, "send", async (cmd) => {
    if (cmd instanceof GetObjectCommand) return { Body: chunks(standingsJson) };
    if (cmd instanceof PutObjectCommand) {
      capture.key = cmd.input.Key;
      capture.body = cmd.input.Body;
      return {};
    }
    return {};
  });
}

function installFetch(byKind) {
  global.fetch = async (url) => {
    const u = String(url);
    const data = u.includes("/batting")
      ? byKind.batting
      : u.includes("/running")
        ? byKind.running
        : u.includes("/pitching")
          ? byKind.pitching
          : null;
    if (data === null) throw new Error("unexpected fetch url: " + u);
    return { ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) };
  };
}

test("transform invariants: avg/ip/era formatting, SB merge, output schema", async () => {
  const capture = {};
  installS3(capture, standingsBody([{ wins: "10" }, { wins: "10" }]));
  installFetch({
    batting: {
      items: [{
        playerId: "p1", firstName: "Jo", lastName: "Bat", teamId: "t1", teamName: "Team One",
        stats: { AB: 5, H: 4, "2B": 2, "3B": 0, HR: 0, R: 2, RBI: 1, BB: 0, HBP: 0, SO: 1, SF: 0, GIDP: 0,
          RATES: { AVG: 0.8, OBP: 0.8, SLG: 1.2 } },
      }],
    },
    running: { items: [{ playerId: "p1", stats: { SB: 5 } }] },
    pitching: {
      items: [{
        playerId: "q1", firstName: "Ed", lastName: "Pitch", teamId: "t1", teamName: "Team One",
        stats: { OUTS_PITCHED: 17, BF: 20, W: 2, L: 1, R: 3, ER: 3, H: 5, BB: 2, SO: 6, G: 1, GS: 1,
          RATES: { ERA: 3.0, WHIP: 1.0 } },
      }],
    },
  });

  const res = await mod.handler({ year: "2026" });
  assert.equal(res.success, true);
  assert.equal(res.key, "league-leaders/2026-league-leaders.json");

  const payload = JSON.parse(capture.body);
  assert.equal(capture.key, "league-leaders/2026-league-leaders.json");
  assert.equal(payload.year, "2026");
  assert.equal(payload.stats.link, "iscore");
  assert.equal(payload.stats.season, "season-xyz");

  const b = payload.stats.batting.player[0];
  assert.equal(b.playername, "Jo Bat");
  assert.equal(b.avg, "0.800"); // fmtAvg(0.8) -> 3 decimals
  assert.equal(b.bib, "2"); // 2B mapped to bib
  assert.equal(b.sb, "5"); // merged from running leaderboard

  const p = payload.stats.pitching.player[0];
  assert.equal(p.ip, "5.2"); // 17 outs -> 5.2 innings
  assert.equal(p.era, "3.00"); // fmtEra -> 2 decimals
  assert.equal(p.whip, "1.00"); // fmtWhip -> 2 decimals

  mock.restoreAll();
});

test("contract: real iScore fixtures produce valid LeagueLeadersData", async () => {
  const fx = (n) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", n), "utf8"));
  const capture = {};
  installS3(capture, standingsBody(Array.from({ length: 10 }, () => ({ wins: "24" }))));
  installFetch({ batting: fx("batting.json"), running: fx("running.json"), pitching: fx("pitching.json") });

  await mod.handler({ year: "2026" });
  const payload = JSON.parse(capture.body);

  assert.ok(payload.stats.batting.player.length > 0, "expected batters");
  for (const row of payload.stats.batting.player) {
    for (const k of ["playerid", "playername", "teamname", "ab", "hits", "hr", "rbi", "avg", "sb"]) {
      assert.ok(k in row, "batter row missing key: " + k);
    }
    assert.match(row.avg, /^\d+\.\d{3}$/, "avg must have 3 decimals: " + row.avg);
  }
  for (const row of payload.stats.pitching.player) {
    assert.match(row.era, /^\d+\.\d{2}$/, "era must have 2 decimals: " + row.era);
    assert.match(row.ip, /^\d+\.\d$/, "ip must be baseball innings: " + row.ip);
  }
  // pitching list is sorted by ERA ascending
  const eras = payload.stats.pitching.player.map((p) => Number(p.era));
  for (let i = 1; i < eras.length; i++) {
    assert.ok(eras[i] >= eras[i - 1], "pitching not ERA-ascending");
  }

  mock.restoreAll();
});
