import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  resolveAccountSeat,
  permissionsForSeat,
  SEATS,
  roleFieldsForAssignedSeat,
  teamSignupLabel,
  ASSIGNABLE_TEAM_SEATS,
} from "../lib/accountPermissions.js";

describe("resolveAccountSeat", () => {
  test("legacy league with no team is public, not league office", () => {
    assert.equal(resolveAccountSeat({ role: "league", team_id: null }), SEATS.PUBLIC);
  });

  test("a member removed from a team does not gain every roster", () => {
    const removed = { role: "league", team_id: null, is_admin: true, team_role: "Team Admin" };
    assert.equal(resolveAccountSeat(removed), SEATS.PUBLIC);
    assert.equal(permissionsForSeat(resolveAccountSeat(removed)).everyRoster, false);
  });

  test("only the explicit league office role is league office", () => {
    assert.equal(resolveAccountSeat({ role: "league office", team_id: null }), SEATS.LEAGUE_OFFICE);
  });

  test("each seat stored as league plus team_role resolves to that seat", () => {
    const onTeam = { role: "league", team_id: 3 };
    assert.equal(resolveAccountSeat({ ...onTeam, team_role: "Player" }), SEATS.PLAYER);
    assert.equal(resolveAccountSeat({ ...onTeam, team_role: "Coach" }), SEATS.COACH);
    assert.equal(
      resolveAccountSeat({ ...onTeam, team_role: "Private Widget Developer" }),
      SEATS.PRIVATE_WIDGET_DEVELOPER,
    );
    assert.equal(
      resolveAccountSeat({ ...onTeam, team_role: "Team Admin", is_admin: true }),
      SEATS.TEAM_ADMIN,
    );
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
  test("every seat can open Home and Around the League", () => {
    for (const seat of [...Object.values(SEATS), "unknown seat"]) {
      const perms = permissionsForSeat(seat);
      assert.equal(perms.home, true, seat);
      assert.equal(perms.aroundLeague, true, seat);
    }
  });

  test("clubhouse manager sees Home, the clubhouse widget and around the league", () => {
    const perms = permissionsForSeat(SEATS.CLUBHOUSE_MANAGER);
    assert.equal(perms.aroundLeague, true);
    assert.equal(perms.clubhouseOnly, true);
    assert.equal(perms.home, true);
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

  test("website admin can manage every team's roster and seats", () => {
    const perms = permissionsForSeat(SEATS.WEBSITE_ADMIN);
    assert.equal(perms.approveSite, true);
    assert.equal(perms.everyRoster, true);
    assert.equal(perms.invites, true);
    assert.equal(perms.setSeats, true);
    assert.equal(perms.home, true);
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
      role: "league",
      isAdmin: false,
      teamRole: "Coach",
    });
  });

  test("every assignable seat keeps role league so chk_role_team_id passes", () => {
    for (const seat of ASSIGNABLE_TEAM_SEATS) {
      const fields = roleFieldsForAssignedSeat(seat);
      assert.equal(fields.role, "league", seat);
      assert.equal(fields.teamRole, seat);
      assert.equal(fields.isAdmin, seat === "Team Admin");
    }
  });

  test("a stored seat resolves back to the seat that was assigned", () => {
    for (const seat of ASSIGNABLE_TEAM_SEATS) {
      const fields = roleFieldsForAssignedSeat(seat);
      const stored = { role: fields.role, is_admin: fields.isAdmin, team_role: fields.teamRole, team_id: 3 };
      assert.equal(resolveAccountSeat(stored), seat.toLowerCase(), seat);
    }
  });
});
