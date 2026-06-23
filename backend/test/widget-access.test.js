/**
 * getAllWidgets visibility rules (public / user_widget / widget_team_access).
 *
 * Run: node --test backend/test/widget-access.test.js
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  isPublicVisibility,
  shouldIncludeTeamAccessRule,
  widgetPassesGetAllWidgetsFilter,
  filterWidgetsForGetAllWidgets,
  getGetAllWidgetsAccessPaths,
} from "../lib/widgetAccess.js";

/** Fixture widgets matching typical DB rows */
const WIDGETS = {
  publicStats: { widget_id: 1, widget_name: "Public Stats", visibility: "public" },
  lineupPro: { widget_id: 2, widget_name: "Lineup Pro", visibility: "private" },
  pitchingLab: { widget_id: 3, widget_name: "Pitching Lab", visibility: "private" },
  devTool: { widget_id: 4, widget_name: "Dev Tool", visibility: "private" },
  legacyPublic: { widget_id: 5, widget_name: "Legacy", visibility: null },
};

const ALL = Object.values(WIDGETS);

describe("isPublicVisibility", () => {
  test("public (any case) and null visibility count as public", () => {
    assert.equal(isPublicVisibility("public"), true);
    assert.equal(isPublicVisibility("Public"), true);
    assert.equal(isPublicVisibility(null), true);
    assert.equal(isPublicVisibility(undefined), true);
  });

  test("private is not public", () => {
    assert.equal(isPublicVisibility("private"), false);
  });
});

describe("shouldIncludeTeamAccessRule", () => {
  test("league user with team → team access applies", () => {
    assert.equal(
      shouldIncludeTeamAccessRule({ userRole: "league", userTeamId: 5 }),
      true
    );
  });

  test("widget developer with team → team access does NOT apply", () => {
    assert.equal(
      shouldIncludeTeamAccessRule({ userRole: "widget developer", userTeamId: 5 }),
      false
    );
  });

  test("league user without team → no team access", () => {
    assert.equal(
      shouldIncludeTeamAccessRule({ userRole: "league", userTeamId: null }),
      false
    );
  });
});

describe("getGetAllWidgetsAccessPaths (mirrors getAllWidgets query branches)", () => {
  test("no userId → only public path", () => {
    assert.deepEqual(getGetAllWidgetsAccessPaths({ userId: null }), {
      public: true,
      userWidget: false,
      teamAccess: false,
    });
  });

  test("league + team → public, user_widget, and team paths", () => {
    assert.deepEqual(
      getGetAllWidgetsAccessPaths({
        userId: 20,
        userRole: "league",
        userTeamId: 5,
      }),
      { public: true, userWidget: true, teamAccess: true }
    );
  });

  test("widget developer → no team path even with team_id", () => {
    assert.deepEqual(
      getGetAllWidgetsAccessPaths({
        userId: 10,
        userRole: "widget developer",
        userTeamId: 5,
      }),
      { public: true, userWidget: true, teamAccess: false }
    );
  });
});

describe("filterWidgetsForGetAllWidgets — role / team / user_widget combinations", () => {
  test("no userId → public widgets only", () => {
    const result = filterWidgetsForGetAllWidgets(ALL, { userId: null });
    assert.deepEqual(
      result.map((w) => w.widget_id).sort(),
      [1, 5]
    );
  });

  test("league user on team 5 → public + team-linked private widget", () => {
    const result = filterWidgetsForGetAllWidgets(ALL, {
      userId: 20,
      userRole: "league",
      userTeamId: 5,
      userLinkedWidgetIds: [],
      teamLinkedWidgetIds: [2],
    });
    assert.deepEqual(result.map((w) => w.widget_id).sort(), [1, 2, 5]);
  });

  test("league user on different team → no team private widgets", () => {
    const result = filterWidgetsForGetAllWidgets(ALL, {
      userId: 30,
      userRole: "league",
      userTeamId: 99,
      userLinkedWidgetIds: [],
      teamLinkedWidgetIds: [], // team 99 has no widget_team_access rows
    });
    assert.deepEqual(result.map((w) => w.widget_id).sort(), [1, 5]);
  });

  test("widget developer with user_widget → public + owned widget, not team-only", () => {
    const result = filterWidgetsForGetAllWidgets(ALL, {
      userId: 10,
      userRole: "widget developer",
      userTeamId: 5,
      userLinkedWidgetIds: [4],
      teamLinkedWidgetIds: [2],
    });
    assert.deepEqual(result.map((w) => w.widget_id).sort(), [1, 4, 5]);
    assert.ok(!result.some((w) => w.widget_id === 2));
  });

  test("widget developer with no user_widget → public only", () => {
    const result = filterWidgetsForGetAllWidgets(ALL, {
      userId: 11,
      userRole: "widget developer",
      userTeamId: 5,
      userLinkedWidgetIds: [],
      teamLinkedWidgetIds: [2, 3],
    });
    assert.deepEqual(result.map((w) => w.widget_id).sort(), [1, 5]);
  });

  test("league user with both team access and user_widget member", () => {
    const result = filterWidgetsForGetAllWidgets(ALL, {
      userId: 25,
      userRole: "league",
      userTeamId: 5,
      userLinkedWidgetIds: [3],
      teamLinkedWidgetIds: [2],
    });
    assert.deepEqual(result.map((w) => w.widget_id).sort(), [1, 2, 3, 5]);
  });

  test("standard user role with team gets team widgets", () => {
    const result = filterWidgetsForGetAllWidgets(ALL, {
      userId: 40,
      userRole: "user",
      userTeamId: 5,
      userLinkedWidgetIds: [],
      teamLinkedWidgetIds: [2],
    });
    assert.deepEqual(result.map((w) => w.widget_id).sort(), [1, 2, 5]);
  });
});

describe("widgetPassesGetAllWidgetsFilter — individual widget cases", () => {
  test("private widget without any link → not visible", () => {
    assert.equal(
      widgetPassesGetAllWidgetsFilter(WIDGETS.pitchingLab, {
        userId: 20,
        userRole: "league",
        userTeamId: 5,
        userLinkedWidgetIds: [],
        teamLinkedWidgetIds: [2],
      }),
      false
    );
  });

  test("private widget visible via user_widget even without team", () => {
    assert.equal(
      widgetPassesGetAllWidgetsFilter(WIDGETS.pitchingLab, {
        userId: 20,
        userRole: "league",
        userTeamId: null,
        userLinkedWidgetIds: [3],
        teamLinkedWidgetIds: [],
      }),
      true
    );
  });
});
