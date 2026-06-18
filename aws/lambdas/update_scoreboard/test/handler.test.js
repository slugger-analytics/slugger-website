"use strict";
/** TDD for update_scoreboard (iScore -> Aurora `scores`). DB write is verified live. */
const { test } = require("node:test");
const assert = require("node:assert");

process.env.DB_HOST = "alpb-1.cluster-ro-cx866cecsebt.us-east-2.rds.amazonaws.com";
const mod = require("../index.js");

test("statusOf maps iScore gameStatusId to the scores vocabulary", () => {
  assert.equal(mod.statusOf(1), "SCHEDULED");
  assert.equal(mod.statusOf(2), "LIVE");
  assert.equal(mod.statusOf(3), "FINAL");
  assert.equal(mod.statusOf(99), "SCHEDULED"); // safe default
});

test("writerHost rewrites the read-only Aurora endpoint to the writer", () => {
  assert.equal(
    mod.writerHost("alpb-1.cluster-ro-cx866cecsebt.us-east-2.rds.amazonaws.com"),
    "alpb-1.cluster-cx866cecsebt.us-east-2.rds.amazonaws.com",
  );
  assert.equal(mod.writerHost("alpb-1.cluster-abc.us-east-2.rds.amazonaws.com"), "alpb-1.cluster-abc.us-east-2.rds.amazonaws.com");
});

test("windowDates spans +/- 2 days around now", () => {
  const now = new Date("2026-06-18T01:00:00Z");
  const { from, to } = mod.windowDates(now);
  assert.equal(from, "2026-06-16T01:00:00.000Z");
  assert.equal(to, "2026-06-20T01:00:00.000Z");
});

test("buildRows maps games + latest-score to scores rows", async () => {
  const games = [
    {
      gameGuid: "g-final",
      scheduledDate: "2026-06-17T22:20:00Z",
      homeTeam: { name: "Hagerstown Flying Boxcars" },
      awayTeam: { name: "Charleston Dirty Birds" },
      gameStatusId: 3,
      gameInfo: { location: "Municipal Stadium" },
    },
    {
      gameGuid: "g-sched",
      scheduledDate: "2026-06-18T22:50:00Z",
      homeTeam: { name: "Gastonia Ghost Peppers" },
      awayTeam: { name: "Staten Island Ferry Hawks" },
      gameStatusId: 1,
      gameInfo: { location: "CaroMont Health Park" },
    },
  ];
  global.fetch = async (url) => {
    const u = String(url);
    if (u.includes("/games/g-final/latest-score")) {
      return { ok: true, status: 200, json: async () => ({ teams: { HOME: { runs: 11 }, AWAY: { runs: 4 } } }) };
    }
    // scheduled game: no score available
    return { ok: false, status: 500, json: async () => ({}) };
  };

  const rows = await mod.buildRows(games);
  assert.equal(rows.length, 2);

  assert.deepEqual(rows[0], {
    game_id: "g-final",
    date: "2026-06-17T22:20:00Z",
    home_team_name: "Hagerstown Flying Boxcars",
    visiting_team_name: "Charleston Dirty Birds",
    home_team_score: 11,
    visiting_team_score: 4,
    game_status: "FINAL",
    field: "Municipal Stadium",
  });

  assert.equal(rows[1].game_status, "SCHEDULED");
  assert.equal(rows[1].home_team_score, null); // no score for scheduled game
  assert.equal(rows[1].visiting_team_score, null);
  assert.equal(rows[1].date, "2026-06-18T22:50:00Z");
});

test("UPSERT targets scores with ON CONFLICT (game_id) and rowParams ordering", () => {
  assert.match(mod.UPSERT, /INSERT INTO scores/);
  assert.match(mod.UPSERT, /ON CONFLICT \(game_id\) DO UPDATE/);
  const r = { game_id: "x", date: "d", home_team_name: "h", visiting_team_name: "v", home_team_score: 1, visiting_team_score: 2, game_status: "FINAL", field: "f" };
  assert.deepEqual(mod.rowParams(r), ["x", "d", "h", "v", 1, 2, "FINAL", "f"]);
});
