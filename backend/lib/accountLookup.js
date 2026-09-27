/**
 * GET /users may read another account only when the caller is a site admin.
 * Otherwise the id is the session user, even if the request names someone else.
 *
 * @throws {Error & { status: number }}
 */
export function resolveViewedUserId({ role, sessionUserId, requestedId }) {
  const isSiteAdmin = role === "admin";
  if (
    requestedId != null &&
    String(requestedId) !== String(sessionUserId) &&
    !isSiteAdmin
  ) {
    const error = new Error("You can only view your own account.");
    error.status = 403;
    throw error;
  }
  return isSiteAdmin && requestedId != null ? requestedId : sessionUserId;
}

/**
 * Public signup cannot choose a team. Membership comes from a verified
 * invite at sign-in, or from an admin.
 */
export function signupTeamFields() {
  return { teamId: null, teamRole: null };
}
