/**
 * Who may change a private widget's audience: its visibility, and which
 * teams are granted access.
 */

function sameSet(left, right) {
  return left.length === right.length && left.every((id) => right.includes(id));
}

/**
 * A member may edit other fields, but not public vs private.
 * Site admins and widget owners may change visibility.
 */
export function canChangeWidgetVisibility({ role, widgetRole, currentVisibility, nextVisibility }) {
  if (nextVisibility === undefined) return true;
  const changed =
    String(currentVisibility || "").toLowerCase() !== String(nextVisibility).toLowerCase();
  if (!changed) return true;
  return role === "admin" || widgetRole === "owner";
}

/**
 * Team ids to store on a private widget.
 * A site admin may replace the list. Anyone else may only add or remove
 * their own team; teams already granted stay in place.
 *
 * @throws {Error & { status: number }} when the requested change is not allowed
 */
/**
 * Teams stored on a new private-widget request.
 * Public widgets get no teams. A site admin may name any teams.
 * Anyone else may only name their own team.
 *
 * @throws {Error & { status: number }}
 */
export function registrationTeamIds({ role, teamId, visibility, requestedTeamIds }) {
  const requested = Array.isArray(requestedTeamIds) ? requestedTeamIds.map((id) => String(id)) : [];
  if (String(visibility || "").toLowerCase() !== "private") {
    return [];
  }
  if (role === "admin") {
    return requested;
  }
  if (teamId != null) {
    const ownTeamId = String(teamId);
    if (requested.some((id) => id !== ownTeamId)) {
      const error = new Error("You can only register a private widget for your own team.");
      error.status = 403;
      throw error;
    }
    return [teamId];
  }
  if (requested.length > 0) {
    const error = new Error("You are not on a team, so you cannot assign this widget to a team.");
    error.status = 403;
    throw error;
  }
  return [];
}

export function nextWidgetTeamIds({ role, teamId, currentTeamIds, requestedTeamIds }) {
  const current = Array.isArray(currentTeamIds) ? currentTeamIds : [];
  const requestedList = Array.isArray(requestedTeamIds) ? requestedTeamIds : [];
  const requested = requestedList.map((id) => String(id));
  const currentIds = current.map((id) => String(id));

  if (role === "admin") {
    return requestedList;
  }

  if (teamId == null) {
    if (!sameSet(currentIds, requested)) {
      const error = new Error("You are not on a team, so you cannot change which teams can use this widget.");
      error.status = 403;
      throw error;
    }
    return [...current];
  }

  const ownTeamId = String(teamId);
  const currentOthers = currentIds.filter((id) => id !== ownTeamId);
  const requestedOthers = requested.filter((id) => id !== ownTeamId);
  if (!sameSet(currentOthers, requestedOthers)) {
    const error = new Error("You can only change access for your own team.");
    error.status = 403;
    throw error;
  }

  const next = current.filter((id) => String(id) !== ownTeamId);
  if (requested.includes(ownTeamId)) {
    next.push(teamId);
  }
  return next;
}
