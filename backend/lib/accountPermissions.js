/**
 * Account seats under SLUGGER Login.
 * Team Side and Site Side are groups. A person holds one seat.
 * Existing rows still use role "league", "admin", or "widget developer";
 * those are mapped here so the local copy does not need a rewrite.
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
};

const TEAM_SEATS = new Set([
  SEATS.PLAYER,
  SEATS.COACH,
  SEATS.CLUBHOUSE_MANAGER,
  SEATS.TEAM_ADMIN,
  SEATS.PRIVATE_WIDGET_DEVELOPER,
]);

function text(value) {
  return String(value || "").trim().toLowerCase();
}

function hasTeam(user) {
  const teamId = user?.team_id ?? user?.teamId;
  return teamId != null && String(teamId) !== "" && String(teamId) !== "null";
}

/**
 * @param {{ role?: string, team_role?: string, teamRole?: string, is_admin?: boolean, isAdmin?: boolean, team_id?: unknown, teamId?: unknown }} user
 */
export function resolveAccountSeat(user = {}) {
  const role = text(user.role);
  const teamRole = text(user.team_role ?? user.teamRole);
  const isAdmin = Boolean(user.is_admin ?? user.isAdmin);
  const onTeam = hasTeam(user);

  if (role === "admin" || role === "website admin" || role === "master") return SEATS.WEBSITE_ADMIN;
  if (role === "widget developer" || role === "public widget developer" || role === "site side") return SEATS.PUBLIC_WIDGET_DEVELOPER;
  if (role === "league office") return SEATS.LEAGUE_OFFICE;
  if (role === "public") return SEATS.PUBLIC;
  if (role === "team side") return SEATS.TEAM_SIDE;
  if (TEAM_SEATS.has(role)) return role;

  if (role === "league" || role === "user" || role === "") {
    if (!onTeam && (role === "league" || role === "league office")) return SEATS.LEAGUE_OFFICE;
    if (isAdmin || teamRole === "team admin") return SEATS.TEAM_ADMIN;
    if (teamRole === "clubhouse manager") return SEATS.CLUBHOUSE_MANAGER;
    if (teamRole === "player") return SEATS.PLAYER;
    if (teamRole === "private widget developer") return SEATS.PRIVATE_WIDGET_DEVELOPER;
    if (onTeam) return SEATS.COACH;
  }

  return SEATS.PUBLIC;
}

export function permissionsForSeat(seat) {
  const teamView = {
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
      return {
        ...teamView,
        myTeam: true,
        everyRoster: true,
        invites: false,
        setSeats: false,
      };
    case SEATS.TEAM_SIDE:
      return teamView;
    case SEATS.PLAYER:
      return teamView;
    case SEATS.COACH:
      return teamView;
    case SEATS.CLUBHOUSE_MANAGER:
      return {
        ...teamView,
        home: false,
        widgets: true,
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
      return {
        ...teamView,
        home: false,
        myTeam: false,
        rosterRead: false,
        approveSite: true,
      };
    default:
      return {
        home: false,
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

export function permissionsForUser(user) {
  return permissionsForSeat(resolveAccountSeat(user));
}

export function seatLabel(seat) {
  const labels = {
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
  return labels[seat] || "Public Access";
}

/** Seats a team admin may assign. One person, one seat. */
export const ASSIGNABLE_TEAM_SEATS = [
  "Player",
  "Coach",
  "Clubhouse Manager",
  "Team Admin",
  "Private Widget Developer",
];

/** Label stored on a team-side account created from registration. Team Admin is not included. */
export function teamSignupLabel(role) {
  const seat = text(role);
  const labels = {
    player: "Player",
    coach: "Coach",
    "clubhouse manager": "Clubhouse Manager",
    "private widget developer": "Private Widget Developer",
  };
  return labels[seat] || null;
}

export function roleFieldsForAssignedSeat(label) {
  const seat = text(label);
  const map = {
    player: ["player", false, "Player"],
    coach: ["coach", false, "Coach"],
    member: ["coach", false, "Coach"],
    "clubhouse manager": ["clubhouse manager", false, "Clubhouse Manager"],
    "team admin": ["team admin", true, "Team Admin"],
    "private widget developer": ["private widget developer", false, "Private Widget Developer"],
  };
  const fields = map[seat];
  if (!fields) return null;
  return { role: fields[0], isAdmin: fields[1], teamRole: fields[2] };
}
