import type { AuthUser } from "./auth-store";
import type { UserType } from "@/data/types";
import type { WidgetAuthUser } from "./widget-protocol";

function appUserPopulated(appUser: UserType | undefined): appUser is UserType {
  return Boolean(appUser?.id);
}

export function resolveWidgetAuthUser(
  fromTokens: AuthUser | undefined,
  appUser: UserType | undefined
): WidgetAuthUser | undefined {
  const id = fromTokens?.id ?? (appUserPopulated(appUser) ? appUser.id : undefined);
  if (!id) return undefined;

  const teamNameField = appUserPopulated(appUser)
    ? (appUser as UserType & { teamName?: string }).teamName
    : undefined;
  const teamName =
    typeof teamNameField === "string" && teamNameField.trim() !== ""
      ? teamNameField
      : undefined;

  const email =
    (fromTokens?.email ?? (appUserPopulated(appUser) ? appUser.email : "")) || "";
  const firstName =
    (fromTokens?.firstName ?? (appUserPopulated(appUser) ? appUser.first : "")) || "";
  const lastName =
    (fromTokens?.lastName ?? (appUserPopulated(appUser) ? appUser.last : "")) || "";
  const role =
    (fromTokens?.role ?? (appUserPopulated(appUser) ? appUser.role : "")) || "";

  return {
    id: String(id),
    email,
    firstName,
    lastName,
    role,
    teamId:
      fromTokens?.teamId ??
      (appUserPopulated(appUser) && appUser.teamId ? String(appUser.teamId) : undefined),
    teamRole: fromTokens?.teamRole,
    isAdmin: fromTokens?.isAdmin ?? (appUserPopulated(appUser) ? appUser.is_admin : undefined),
    teamName,
  };
}
