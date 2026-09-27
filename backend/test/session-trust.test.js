/**
 * Rules that keep a client from choosing someone else's identity or team.
 *
 * Run: node --test backend/test/session-trust.test.js
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { canReadAccountStatus } from "../lib/accountApproval.js";
import { resolveViewedUserId, signupTeamFields } from "../lib/accountLookup.js";
import { sessionBelongsToTeam } from "../lib/teamMemberMove.js";
import {
  isAssignableWidgetRole,
  isWidgetDeveloperRole,
  parseAssigneeId,
} from "../lib/widgetAssignment.js";
import { registrationTeamIds } from "../lib/widgetAudience.js";
import {
  launchRecordedUserId,
  parseWidgetPdfFileName,
  tokenRequestMatchesSession,
} from "../lib/widgetAccess.js";

function expectStatus(fn, status) {
  assert.throws(fn, (error) => error.status === status);
}

describe("registrationTeamIds", () => {
  test("a public widget is not attached to any team", () => {
    assert.deepEqual(
      registrationTeamIds({
        role: "league",
        teamId: "team-a",
        visibility: "public",
        requestedTeamIds: ["team-b"],
      }),
      []
    );
  });

  test("a site admin may register a private widget for other teams", () => {
    assert.deepEqual(
      registrationTeamIds({
        role: "admin",
        teamId: null,
        visibility: "private",
        requestedTeamIds: ["team-a", "team-b"],
      }),
      ["team-a", "team-b"]
    );
  });

  test("a league user cannot register a private widget for another team", () => {
    expectStatus(
      () =>
        registrationTeamIds({
          role: "league",
          teamId: "team-a",
          visibility: "Private",
          requestedTeamIds: ["team-b"],
        }),
      403
    );
  });

  test("a league user registering for their own team keeps that team", () => {
    assert.deepEqual(
      registrationTeamIds({
        role: "league",
        teamId: 7,
        visibility: "private",
        requestedTeamIds: ["7"],
      }),
      [7]
    );
  });

  test("a user with no team cannot assign teams", () => {
    expectStatus(
      () =>
        registrationTeamIds({
          role: "widget developer",
          teamId: null,
          visibility: "private",
          requestedTeamIds: ["team-a"],
        }),
      403
    );
  });

  test("a user with no team may register a private widget with no teams", () => {
    assert.deepEqual(
      registrationTeamIds({
        role: "widget developer",
        teamId: null,
        visibility: "private",
        requestedTeamIds: [],
      }),
      []
    );
  });
});

describe("resolveViewedUserId", () => {
  test("a non-admin asking for another id is rejected", () => {
    expectStatus(
      () =>
        resolveViewedUserId({
          role: "league",
          sessionUserId: 4,
          requestedId: "9",
        }),
      403
    );
  });

  test("a non-admin asking for their own id, as a string, sees themselves", () => {
    assert.equal(
      resolveViewedUserId({
        role: "league",
        sessionUserId: 4,
        requestedId: "4",
      }),
      4
    );
  });

  test("a non-admin with no requested id sees their session user", () => {
    assert.equal(
      resolveViewedUserId({
        role: "widget developer",
        sessionUserId: 4,
        requestedId: undefined,
      }),
      4
    );
  });

  test("a site admin may view another account", () => {
    assert.equal(
      resolveViewedUserId({
        role: "admin",
        sessionUserId: 1,
        requestedId: 9,
      }),
      9
    );
  });
});

describe("signupTeamFields", () => {
  test("signup never carries a client-supplied team", () => {
    assert.deepEqual(signupTeamFields(), { teamId: null, teamRole: null });
  });
});

describe("canReadAccountStatus", () => {
  test("a user cannot read another email", () => {
    assert.equal(
      canReadAccountStatus({
        role: "league",
        sessionEmail: "me@example.com",
        requestedEmail: "other@example.com",
      }),
      false
    );
  });

  test("a user can read their own email regardless of case", () => {
    assert.equal(
      canReadAccountStatus({
        role: "widget developer",
        sessionEmail: "Me@Example.com",
        requestedEmail: "me@example.com",
      }),
      true
    );
  });

  test("a site admin can read any email", () => {
    assert.equal(
      canReadAccountStatus({
        role: "admin",
        sessionEmail: "admin@example.com",
        requestedEmail: "other@example.com",
      }),
      true
    );
  });
});

describe("sessionBelongsToTeam", () => {
  test("a numeric session id matches the string team id in the URL", () => {
    assert.equal(
      sessionBelongsToTeam({
        role: "league",
        sessionTeamId: 4,
        requestedTeamId: "4",
      }),
      true
    );
  });

  test("a member of team A is not a member of team B", () => {
    assert.equal(
      sessionBelongsToTeam({
        role: "league",
        sessionTeamId: "team-a",
        requestedTeamId: "team-b",
      }),
      false
    );
  });

  test("a site admin belongs to every team route", () => {
    assert.equal(
      sessionBelongsToTeam({
        role: "admin",
        sessionTeamId: null,
        requestedTeamId: "team-b",
      }),
      true
    );
  });
});

describe("widget assignment", () => {
  test("only a widget developer can be assigned", () => {
    assert.equal(isWidgetDeveloperRole("widget developer"), true);
    assert.equal(isWidgetDeveloperRole("league"), false);
    assert.equal(isWidgetDeveloperRole("admin"), false);
  });

  test("an assignment role is member or owner", () => {
    assert.equal(isAssignableWidgetRole("member"), true);
    assert.equal(isAssignableWidgetRole("owner"), true);
    assert.equal(isAssignableWidgetRole("admin"), false);
  });

  test("the assignee id must be an integer", () => {
    assert.equal(parseAssigneeId("12"), 12);
    assert.equal(parseAssigneeId(4), 4);
    assert.equal(parseAssigneeId("nope"), null);
    assert.equal(parseAssigneeId(undefined), null);
  });
});

describe("parseWidgetPdfFileName", () => {
  test("accepts w{widgetId}-{timestamp}.pdf and returns the widget id", () => {
    assert.equal(parseWidgetPdfFileName("w93-1710000000000.pdf"), "93");
  });

  test("rejects other names and path tricks", () => {
    assert.equal(parseWidgetPdfFileName("report.pdf"), null);
    assert.equal(parseWidgetPdfFileName("../w1-1.pdf"), null);
    assert.equal(parseWidgetPdfFileName("folder/w1-1.pdf"), null);
    assert.equal(parseWidgetPdfFileName(undefined), null);
  });
});

describe("tokenRequestMatchesSession", () => {
  test("the token user must be the session user", () => {
    assert.equal(tokenRequestMatchesSession(4, "4"), true);
    assert.equal(tokenRequestMatchesSession(4, 9), false);
    assert.equal(tokenRequestMatchesSession(4, "nope"), false);
  });
});

describe("launchRecordedUserId", () => {
  test("a launch is stored for the session user", () => {
    assert.equal(launchRecordedUserId(4), 4);
    assert.equal(launchRecordedUserId(null), null);
    assert.equal(launchRecordedUserId(""), null);
  });
});
