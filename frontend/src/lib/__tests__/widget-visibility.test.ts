import { describe, expect, it } from "vitest";
import {
  isActiveWidget,
  isApprovedWidget,
  isHiddenWidget,
  matchesVisibilityFilter,
} from "../widgetVisibility";

const publicApproved = { status: "approved", visibility: "Public" };
const privateApproved = { status: "approved", visibility: "private" };
const pendingPublic = { status: "pending", visibility: "public" };

describe("admin catalog visibility", () => {
  it("treats private, in any case, as hidden", () => {
    expect(isHiddenWidget("Private")).toBe(true);
    expect(isHiddenWidget("public")).toBe(false);
    expect(isHiddenWidget(null)).toBe(false);
  });

  it("keeps the Active badge for an approved hidden widget", () => {
    expect(isApprovedWidget("approved")).toBe(true);
    expect(isApprovedWidget("pending")).toBe(false);
    expect(isApprovedWidget("Approved")).toBe(true);
  });

  it("marks a widget active only when it is approved and not hidden", () => {
    expect(isActiveWidget("approved", "public")).toBe(true);
    expect(isActiveWidget("Approved", "Private")).toBe(false);
    expect(isActiveWidget("pending", "public")).toBe(false);
  });

  it("filters all, active, and hidden widgets", () => {
    const widgets = [publicApproved, privateApproved, pendingPublic];
    expect(widgets.filter((widget) => matchesVisibilityFilter(widget, "all"))).toEqual(widgets);
    expect(widgets.filter((widget) => matchesVisibilityFilter(widget, "active"))).toEqual([
      publicApproved,
    ]);
    expect(widgets.filter((widget) => matchesVisibilityFilter(widget, "hidden"))).toEqual([
      privateApproved,
    ]);
  });
});
