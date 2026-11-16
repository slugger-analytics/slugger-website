/**
 * Same seat rules as backend/lib/accountPermissions.js.
 * Team Side and Site Side are groups. A person holds one seat.
 */

export const SEATS = {
  PUBLIC: "public",
  LEAGUE_OFFICE: "league office",
  TEAM_SIDE: "team side",
  PLAYER: "player",
  COACH: "coach",
  CLUBHOUSE_MANAGER: "clubhouse manager",
  TEAM_ADMIN: "team admin",
  PRIVATE_WIDGET_DEVELOPER: "private widget developer",
  PUBLIC_WIDGET_DEVELOPER: "public widget developer",
  WEBSITE_ADMIN: "website admin",
} as const;

export type AccountSeat = (typeof SEATS)[keyof typeof SEATS];

export type AccountPermissions = {
  home: boolean;
  aroundLeague: boolean;
  widgets: boolean;
  clubhouseOnly: boolean;
  myTeam: boolean;
  rosterRead: boolean;
  everyRoster: boolean;
  invites: boolean;
  setSeats: boolean;
  registerPublicWidget: boolean;
  apiDocs: boolean;
  createPrivateWidget: boolean;
  approveSite: boolean;
};

const TEAM_SEATS = new Set<string>([
  SEATS.PLAYER,
  SEATS.COACH,
  SEATS.CLUBHOUSE_MANAGER,
  SEATS.TEAM_ADMIN,
  SEATS.PRIVATE_WIDGET_DEVELOPER,
]);

function text(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function resolveAccountSeat(user: {
  role?: string;
  team_role?: string | null;
  teamRole?: string | null;
  is_admin?: boolean;
  isAdmin?: boolean;
  team_id?: unknown;
  teamId?: unknown;
} = {}): AccountSeat {
  const role = text(user.role);
  const teamRole = text(user.team_role ?? user.teamRole);
  const isAdmin = Boolean(user.is_admin ?? user.isAdmin);
  const teamId = user.team_id ?? user.teamId;
  const onTeam = teamId != null && String(teamId) !== "" && String(teamId) !== "null";

  if (role === "admin" || role === "website admin" || role === "master") return SEATS.WEBSITE_ADMIN;
  if (role === "widget developer" || role === "public widget developer" || role === "site side") return SEATS.PUBLIC_WIDGET_DEVELOPER;
  if (role === "league office") return SEATS.LEAGUE_OFFICE;
  if (role === "public") return SEATS.PUBLIC;
  if (role === "team side") return SEATS.TEAM_SIDE;
  if (TEAM_SEATS.has(role)) return role as AccountSeat;

  if (role === "league" || role === "user" || role === "") {
    // League Office is only ever the explicit "league office" role above.
    // A league account with no team, such as a removed member, is public.
    if (!onTeam) return SEATS.PUBLIC;
    if (isAdmin || teamRole === "team admin") return SEATS.TEAM_ADMIN;
    if (teamRole === "clubhouse manager") return SEATS.CLUBHOUSE_MANAGER;
    if (teamRole === "player") return SEATS.PLAYER;
    if (teamRole === "private widget developer") return SEATS.PRIVATE_WIDGET_DEVELOPER;
    if (onTeam) return SEATS.COACH;
  }

  return SEATS.PUBLIC;
}

export function permissionsForSeat(seat: AccountSeat): AccountPermissions {
  const teamView: AccountPermissions = {
    home: true,
    aroundLeague: true,
    widgets: true,
    clubhouseOnly: false,
    myTeam: true,
    rosterRead: true,
    everyRoster: false,
    invites: false,
    setSeats: false,
    registerPublicWidget: false,
    apiDocs: false,
    createPrivateWidget: false,
    approveSite: false,
  };

  switch (seat) {
    case SEATS.LEAGUE_OFFICE:
      return { ...teamView, everyRoster: true };
    case SEATS.TEAM_SIDE:
      return teamView;
    case SEATS.PLAYER:
    case SEATS.COACH:
      return teamView;
    case SEATS.CLUBHOUSE_MANAGER:
      return {
        ...teamView,
        home: true,
        clubhouseOnly: true,
        myTeam: false,
        rosterRead: false,
      };
    case SEATS.TEAM_ADMIN:
      return { ...teamView, invites: true, setSeats: true };
    case SEATS.PRIVATE_WIDGET_DEVELOPER:
      return { ...teamView, createPrivateWidget: true };
    case SEATS.PUBLIC_WIDGET_DEVELOPER:
      return {
        ...teamView,
        myTeam: false,
        rosterRead: false,
        registerPublicWidget: true,
        apiDocs: true,
      };
    case SEATS.WEBSITE_ADMIN:
      // A website admin lands on Home and can also manage any team's roster and seats.
      return {
        ...teamView,
        home: true,
        myTeam: true,
        rosterRead: true,
        everyRoster: true,
        invites: true,
        setSeats: true,
        approveSite: true,
      };
    default:
      return {
        home: true,
        aroundLeague: true,
        widgets: true,
        clubhouseOnly: false,
        myTeam: false,
        rosterRead: false,
        everyRoster: false,
        invites: false,
        setSeats: false,
        registerPublicWidget: false,
        apiDocs: false,
        createPrivateWidget: false,
        approveSite: false,
      };
  }
}

export function seatLabel(seat: AccountSeat) {
  const labels: Record<AccountSeat, string> = {
    [SEATS.PUBLIC]: "Public Access",
    [SEATS.LEAGUE_OFFICE]: "League Office",
    [SEATS.TEAM_SIDE]: "Team Side",
    [SEATS.PLAYER]: "Player",
    [SEATS.COACH]: "Coach",
    [SEATS.CLUBHOUSE_MANAGER]: "Clubhouse Manager",
    [SEATS.TEAM_ADMIN]: "Team Admin",
    [SEATS.PRIVATE_WIDGET_DEVELOPER]: "Private Widget Developer",
    [SEATS.PUBLIC_WIDGET_DEVELOPER]: "Public Widget Developer",
    [SEATS.WEBSITE_ADMIN]: "Website Admin",
  };
  return labels[seat];
}

export const VIEW_AS_SEATS: AccountSeat[] = [
  SEATS.LEAGUE_OFFICE,
  SEATS.PLAYER,
  SEATS.COACH,
  SEATS.CLUBHOUSE_MANAGER,
  SEATS.TEAM_ADMIN,
  SEATS.PRIVATE_WIDGET_DEVELOPER,
  SEATS.PUBLIC_WIDGET_DEVELOPER,
  SEATS.WEBSITE_ADMIN,
];

const VIEW_AS_KEY = "slugger_view_as";

export function readViewAs(): AccountSeat | null {
  if (typeof window === "undefined") return null;
  const value = window.sessionStorage.getItem(VIEW_AS_KEY);
  return VIEW_AS_SEATS.includes(value as AccountSeat) ? (value as AccountSeat) : null;
}

export function writeViewAs(seat: AccountSeat | null) {
  if (typeof window === "undefined") return;
  if (!seat || seat === SEATS.WEBSITE_ADMIN) window.sessionStorage.removeItem(VIEW_AS_KEY);
  else window.sessionStorage.setItem(VIEW_AS_KEY, seat);
}
