import { describe, it, expect } from "vitest";
import type { AuthUser } from "../auth-store";
import type { UserType } from "@/data/types";
import { resolveWidgetAuthUser } from "../widget-auth-payload";

const baseAppUser: UserType = {
  id: "99",
  first: "App",
  last: "User",
  email: "app@example.com",
  role: "league",
  teamId: "7",
  is_admin: false,
};

const baseAuthUser: AuthUser = {
  id: "42",
  email: "token@example.com",
  firstName: "Jane",
  lastName: "Doe",
  role: "league",
  teamId: "5",
  teamRole: "coach",
  isAdmin: false,
};

describe("resolveWidgetAuthUser", () => {
  it("returns undefined when neither tokens nor app user has id", () => {
    expect(resolveWidgetAuthUser(undefined, undefined)).toBeUndefined();
    expect(resolveWidgetAuthUser(undefined, { ...baseAppUser, id: "" })).toBeUndefined();
  });

  it("prefers token user id and fields when both are present", () => {
    const u = resolveWidgetAuthUser(baseAuthUser, baseAppUser);
    expect(u).toEqual({
      id: "42",
      email: "token@example.com",
      firstName: "Jane",
      lastName: "Doe",
      role: "league",
      teamId: "5",
      teamRole: "coach",
      isAdmin: false,
      teamName: undefined,
    });
  });

  it("fills from app user when token user is missing", () => {
    const u = resolveWidgetAuthUser(undefined, baseAppUser);
    expect(u).toEqual({
      id: "99",
      email: "app@example.com",
      firstName: "App",
      lastName: "User",
      role: "league",
      teamId: "7",
      teamRole: undefined,
      isAdmin: false,
      teamName: undefined,
    });
  });

  it("merges teamName from app user when present", () => {
    const appWithTeam = {
      ...baseAppUser,
      teamName: "Wildcats",
    } as UserType & { teamName?: string };
    const u = resolveWidgetAuthUser(baseAuthUser, appWithTeam);
    expect(u?.teamName).toBe("Wildcats");
    expect(u?.id).toBe("42");
  });
});
