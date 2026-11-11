import type { AuthUser } from "./auth-store";
import type { UserType } from "@/data/types";
import type { WidgetAuthUser } from "./widget-protocol";
import { resolveAccountSeat, SEATS } from "./accountPermissions";

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
  const storedRole =
    (fromTokens?.role ?? (appUserPopulated(appUser) ? appUser.role : "")) || "";
  const storedTeamRole = fromTokens?.teamRole
    ?? (appUserPopulated(appUser) && typeof appUser.teamRole === "string" ? appUser.teamRole : undefined);
  const teamId =
    fromTokens?.teamId ??
    (appUserPopulated(appUser) && appUser.teamId ? String(appUser.teamId) : undefined);
  const seat = resolveAccountSeat({
    role: storedRole,
    teamRole: storedTeamRole,
    teamId,
    is_admin: fromTokens?.isAdmin ?? (appUserPopulated(appUser) ? appUser.is_admin : undefined),
  });
  const teamRole = seat === SEATS.PLAYER || seat === SEATS.CLUBHOUSE_MANAGER ? seat : storedTeamRole;

  return {
    id: String(id),
    email,
    firstName,
    lastName,
    role: seat === SEATS.PUBLIC ? storedRole : seat,
    teamId,
    teamRole,
    isAdmin: fromTokens?.isAdmin ?? (appUserPopulated(appUser) ? appUser.is_admin : undefined),
    teamName,
  };
}
