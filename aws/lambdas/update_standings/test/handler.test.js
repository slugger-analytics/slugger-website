"use strict";
/**
 * TDD for update_standings (iScore). The iScore standings transform is pinned
 * to the real known-good values from the production standings file.
 */
const { test, mock } = require("node:test");
const assert = require("node:assert");

process.env.BASE_URL = "https://mock.iscore/api/public";
process.env.SEASON_ID = "season-1";
process.env.SEASON_YEAR = "2026";
process.env.STANDINGS_BUCKET_NAME = "test-bucket";

const s3lib = require("@aws-sdk/client-s3");
const { PutObjectCommand } = s3lib;
const mod = require("../index.js");

test("pct rounds half-up at 3 decimals to match production file", () => {
  assert.equal(mod.pct(31, 17), "0.646"); // 31/48
  assert.equal(mod.pct(27, 21), "0.563"); // 27/48 = .5625 -> .563
  assert.equal(mod.pct(21, 27), "0.438"); // .4375 -> .438
  assert.equal(mod.pct(33, 15), "0.688"); // .6875 -> .688
  assert.equal(mod.pct(0, 0), "0.000");
});

test("toStandingsPayload maps iScore #12 response to SLUGGER schema (real values)", () => {
  const resp = {
    leagueId: "L",
    teams: [
      { teamId: "adc0e571", name: "Hagerstown Flying Boxcars", shortName: "HAG", w: 31, l: 17, t: 0, rs: 325, ra: 248, gp: 48 },
      { teamId: "5f287a09", name: "Staten Island Ferry Hawks", shortName: "SI", w: 8, l: 40, t: 0, rs: 200, ra: 455, gp: 48 },
    ],
  };
  const p = toStandings(resp);
  assert.equal(p.year, "2026");
  assert.equal(p.standings.conference[0].name, "OVERALL");
  assert.equal(p.standings.conference[0].division[0].name, "Atlantic League");
  const t0 = p.standings.conference[0].division[0].team[0];
  assert.deepEqual(t0, {
    teamname: "Hagerstown Flying Boxcars",
    shortName: "HAG",
    teamId: "adc0e571",
    wins: "31",
    losses: "17",
    pct: "0.646",
    gp: "48",
    rs: "325",
    ra: "248",
    streak: "",
    last10: "",
  });
  function toStandings(r) {
    return mod.toStandingsPayload(r, "2026");
  }
});

test("handler derives leagueGuid from season, fetches standings, writes S3", async () => {
  global.fetch = async (url) => {
    const u = String(url);
    if (u.includes("/seasons/season-1")) {
      return { ok: true, status: 200, json: async () => ({ leagueGuid: "LG" }), text: async () => "" };
    }
    if (u.includes("/leagues/LG/standings")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ leagueId: "LG", teams: [{ teamId: "t1", name: "York Revolution", shortName: "YRK", w: 27, l: 21, t: 0, rs: 331, ra: 258, gp: 48 }] }),
        text: async () => "",
      };
    }
    throw new Error("unexpected fetch: " + u);
  };
  let captured;
  mock.method(s3lib.S3Client.prototype, "send", async (cmd) => {
    if (cmd instanceof PutObjectCommand) captured = cmd.input;
    return {};
  });

  const res = await mod.handler({});
  assert.equal(res.statusCode, 200);
  assert.equal(captured.Key, "standings/2026-standings.json");
  const payload = JSON.parse(captured.Body);
  const t = payload.standings.conference[0].division[0].team[0];
  assert.equal(t.teamname, "York Revolution");
  assert.equal(t.pct, "0.563");
  assert.equal(t.rs, "331");
  mock.restoreAll();
});

test("handler returns 500 without writing S3 when iScore standings errors", async () => {
  global.fetch = async (url) => {
    const u = String(url);
    if (u.includes("/seasons/")) return { ok: true, status: 200, json: async () => ({ leagueGuid: "LG" }), text: async () => "" };
    return { ok: false, status: 500, json: async () => ({}), text: async () => "boom" };
  };
  let wrote = false;
  mock.method(s3lib.S3Client.prototype, "send", async () => {
    wrote = true;
    return {};
  });
  const res = await mod.handler({});
  assert.equal(res.statusCode, 500);
  assert.equal(wrote, false, "must not write S3 on fetch failure");
  mock.restoreAll();
});
