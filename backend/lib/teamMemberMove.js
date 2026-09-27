/**
 * Whether a team-admin request may change a member's team.
 * Returns null when the move may proceed, or { status, message } to reject it.
 * A missing member is rejected before the cross-team check.
 */
/**
 * Team routes compare the session team with the URL team.
 * Ids may arrive as a number from the session and a string from the URL.
 * A site admin may act on any team.
 */
export function sessionBelongsToTeam({ role, sessionTeamId, requestedTeamId }) {
  if (role === "admin") return true;
  return String(sessionTeamId) === String(requestedTeamId);
}

export function rejectTeamMemberMove({ isSiteAdmin, origTeamId, newTeamId, memberFound }) {
  if (newTeamId == null || newTeamId === "") {
    return { status: 400, message: "teamId is required" };
  }
  if (!memberFound) {
    return { status: 404, message: "Team member not found" };
  }
  if (!isSiteAdmin && String(newTeamId) !== String(origTeamId)) {
    return {
      status: 403,
      message: "You can only manage members of your own team.",
    };
  }
  return null;
}
