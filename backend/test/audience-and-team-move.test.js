/**
 * Private-widget audience changes and team-member moves.
 *
 * Run: node --test backend/test/audience-and-team-move.test.js
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canChangeWidgetVisibility, nextWidgetTeamIds } from "../lib/widgetAudience.js";
import { rejectTeamMemberMove } from "../lib/teamMemberMove.js";

const TEAM_A = "team-a";
const TEAM_B = "team-b";

function expectStatus(fn, status) {
  assert.throws(fn, (error) => error.status === status);
}

describe("canChangeWidgetVisibility", () => {
  test("a member cannot switch a private widget to public", () => {
    assert.equal(
      canChangeWidgetVisibility({
        role: "widget developer",
        widgetRole: "member",
        currentVisibility: "private",
        nextVisibility: "Public",
      }),
      false
    );
  });

  test("a member cannot switch a public widget to private", () => {
    assert.equal(
      canChangeWidgetVisibility({
        role: "widget developer",
        widgetRole: "member",
        currentVisibility: "Public",
        nextVisibility: "private",
      }),
      false
    );
  });

  test("a member may save the same visibility, including a case change", () => {
    assert.equal(
      canChangeWidgetVisibility({
        role: "widget developer",
        widgetRole: "member",
        currentVisibility: "Private",
        nextVisibility: "private",
      }),
      true
    );
  });

  test("a member may edit a widget without sending visibility", () => {
    assert.equal(
      canChangeWidgetVisibility({
        role: "widget developer",
        widgetRole: "member",
        currentVisibility: "private",
        nextVisibility: undefined,
      }),
      true
    );
  });

  test("the widget owner may change visibility", () => {
    assert.equal(
      canChangeWidgetVisibility({
        role: "widget developer",
        widgetRole: "owner",
        currentVisibility: "private",
        nextVisibility: "public",
      }),
      true
    );
  });

  test("a site admin may change visibility without a widget role", () => {
    assert.equal(
      canChangeWidgetVisibility({
        role: "admin",
        widgetRole: undefined,
        currentVisibility: "private",
        nextVisibility: "public",
      }),
      true
    );
  });
});

describe("nextWidgetTeamIds", () => {
  test("a site admin may replace the team list", () => {
    assert.deepEqual(
      nextWidgetTeamIds({
        role: "admin",
        teamId: null,
        currentTeamIds: [TEAM_A],
        requestedTeamIds: [TEAM_B],
      }),
      [TEAM_B]
    );
  });

  test("an owner cannot grant another team", () => {
    expectStatus(
      () =>
        nextWidgetTeamIds({
          role: "league",
          teamId: TEAM_A,
          currentTeamIds: [TEAM_A],
          requestedTeamIds: [TEAM_A, TEAM_B],
        }),
      403
    );
  });

  test("an owner cannot remove a team an admin already granted", () => {
    expectStatus(
      () =>
        nextWidgetTeamIds({
          role: "widget developer",
          teamId: TEAM_A,
          currentTeamIds: [TEAM_A, TEAM_B],
          requestedTeamIds: [TEAM_A],
        }),
      403
    );
  });

  test("an owner may add only their own team and keep the others", () => {
    assert.deepEqual(
      nextWidgetTeamIds({
        role: "league",
        teamId: TEAM_A,
        currentTeamIds: [TEAM_B],
        requestedTeamIds: [TEAM_B, TEAM_A],
      }),
      [TEAM_B, TEAM_A]
    );
  });

  test("an owner may remove only their own team", () => {
    assert.deepEqual(
      nextWidgetTeamIds({
        role: "league",
        teamId: 7,
        currentTeamIds: [7, "team-b"],
        requestedTeamIds: ["team-b"],
      }),
      ["team-b"]
    );
  });

  test("numeric and string ids for the same team are the same team", () => {
    assert.deepEqual(
      nextWidgetTeamIds({
        role: "league",
        teamId: 7,
        currentTeamIds: ["7"],
        requestedTeamIds: [7],
      }),
      [7]
    );
  });

  test("a user with no team cannot change the granted teams", () => {
    expectStatus(
      () =>
        nextWidgetTeamIds({
          role: "widget developer",
          teamId: null,
          currentTeamIds: [TEAM_A],
          requestedTeamIds: [TEAM_B],
        }),
      403
    );
  });

  test("a user with no team may leave the granted teams unchanged", () => {
    assert.deepEqual(
      nextWidgetTeamIds({
        role: "widget developer",
        teamId: null,
        currentTeamIds: [TEAM_A, TEAM_B],
        requestedTeamIds: [TEAM_B, TEAM_A],
      }),
      [TEAM_A, TEAM_B]
    );
  });
});

describe("rejectTeamMemberMove", () => {
  test("a team id is required", () => {
    assert.deepEqual(
      rejectTeamMemberMove({
        isSiteAdmin: false,
        origTeamId: TEAM_A,
        newTeamId: "",
        memberFound: true,
      }),
      { status: 400, message: "teamId is required" }
    );
  });

  test("a person who is not on the source team is not moved", () => {
    assert.deepEqual(
      rejectTeamMemberMove({
        isSiteAdmin: true,
        origTeamId: TEAM_A,
        newTeamId: TEAM_B,
        memberFound: false,
      }),
      { status: 404, message: "Team member not found" }
    );
  });

  test("a team admin cannot move a member onto another team", () => {
    assert.deepEqual(
      rejectTeamMemberMove({
        isSiteAdmin: false,
        origTeamId: TEAM_A,
        newTeamId: TEAM_B,
        memberFound: true,
      })?.status,
      403
    );
  });

  test("a team admin may keep a member on the same team", () => {
    assert.equal(
      rejectTeamMemberMove({
        isSiteAdmin: false,
        origTeamId: 4,
        newTeamId: "4",
        memberFound: true,
      }),
      null
    );
  });

  test("a site admin may move a member onto another team", () => {
    assert.equal(
      rejectTeamMemberMove({
        isSiteAdmin: true,
        origTeamId: TEAM_A,
        newTeamId: TEAM_B,
        memberFound: true,
      }),
      null
    );
  });
});

describe("updateMemberTeam SQL", () => {
  test("the update only matches a league user still on the source team", () => {
    const source = readFileSync(new URL("../services/teamService.js", import.meta.url), "utf8");
    assert.match(
      source,
      /WHERE user_id = \$2 AND team_id = \$3 AND role = 'league'/
    );
  });
});
