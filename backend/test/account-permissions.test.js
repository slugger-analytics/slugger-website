import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  resolveAccountSeat,
  permissionsForSeat,
  SEATS,
  roleFieldsForAssignedSeat,
  teamSignupLabel,
} from "../lib/accountPermissions.js";

describe("resolveAccountSeat", () => {
  test("legacy league with no team is league office", () => {
    assert.equal(resolveAccountSeat({ role: "league", team_id: null }), SEATS.LEAGUE_OFFICE);
  });

  test("legacy league on a team is a coach", () => {
    assert.equal(resolveAccountSeat({ role: "league", team_id: 3 }), SEATS.COACH);
  });

  test("legacy team admin flag is team admin", () => {
    assert.equal(
      resolveAccountSeat({ role: "league", team_id: 3, is_admin: true }),
      SEATS.TEAM_ADMIN,
    );
  });

  test("clubhouse manager label stays clubhouse manager", () => {
    assert.equal(
      resolveAccountSeat({ role: "league", team_id: 3, team_role: "Clubhouse Manager" }),
      SEATS.CLUBHOUSE_MANAGER,
    );
  });

  test("widget developer and site admin keep their sides", () => {
    assert.equal(resolveAccountSeat({ role: "widget developer" }), SEATS.PUBLIC_WIDGET_DEVELOPER);
    assert.equal(resolveAccountSeat({ role: "admin" }), SEATS.WEBSITE_ADMIN);
  });

  test("the four register choices keep their permissions", () => {
    assert.equal(resolveAccountSeat({ role: "league office" }), SEATS.LEAGUE_OFFICE);
    assert.equal(resolveAccountSeat({ role: "team side" }), SEATS.TEAM_SIDE);
    assert.equal(resolveAccountSeat({ role: "public" }), SEATS.PUBLIC);
    const teamSide = permissionsForSeat(SEATS.TEAM_SIDE);
    assert.equal(teamSide.home, true);
    assert.equal(teamSide.myTeam, true);
    assert.equal(teamSide.invites, false);
    const publicAccess = permissionsForSeat(SEATS.PUBLIC);
    assert.equal(publicAccess.aroundLeague, true);
    assert.equal(publicAccess.widgets, true);
    assert.equal(publicAccess.myTeam, false);
    assert.equal(publicAccess.registerPublicWidget, false);
  });
});

describe("permissionsForSeat", () => {
  test("clubhouse manager sees the clubhouse widget and around the league only", () => {
    const perms = permissionsForSeat(SEATS.CLUBHOUSE_MANAGER);
    assert.equal(perms.aroundLeague, true);
    assert.equal(perms.clubhouseOnly, true);
    assert.equal(perms.home, false);
    assert.equal(perms.myTeam, false);
    assert.equal(perms.invites, false);
  });

  test("team admin has the coach view plus invites and seats", () => {
    const coach = permissionsForSeat(SEATS.COACH);
    const admin = permissionsForSeat(SEATS.TEAM_ADMIN);
    assert.equal(coach.invites, false);
    assert.equal(admin.myTeam, true);
    assert.equal(admin.invites, true);
    assert.equal(admin.setSeats, true);
  });

  test("private widget developer does not get the public API docs", () => {
    const perms = permissionsForSeat(SEATS.PRIVATE_WIDGET_DEVELOPER);
    assert.equal(perms.createPrivateWidget, true);
    assert.equal(perms.apiDocs, false);
    assert.equal(perms.registerPublicWidget, false);
  });

  test("league office can read every roster and cannot change seats", () => {
    const perms = permissionsForSeat(SEATS.LEAGUE_OFFICE);
    assert.equal(perms.everyRoster, true);
    assert.equal(perms.invites, false);
    assert.equal(perms.setSeats, false);
    assert.equal(perms.approveSite, false);
  });
});

describe("teamSignupLabel", () => {
  test("registration can store a team seat, but not team admin", () => {
    assert.equal(teamSignupLabel("player"), "Player");
    assert.equal(teamSignupLabel("clubhouse manager"), "Clubhouse Manager");
    assert.equal(teamSignupLabel("team admin"), null);
    assert.equal(teamSignupLabel("league office"), null);
  });
});

describe("roleFieldsForAssignedSeat", () => {
  test("member maps to coach", () => {
    assert.deepEqual(roleFieldsForAssignedSeat("Member"), {
      role: "coach",
      isAdmin: false,
      teamRole: "Coach",
    });
  });
});
