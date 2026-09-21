/**
 * Pure helpers for getAllWidgets visibility rules (public / user_widget / team access).
 * Access paths are OR'd; an optional name search is AND'd on top.
 */

/**
 * @param {string | null | undefined} visibility
 */
export function isPublicVisibility(visibility) {
  if (visibility == null) return true;
  return String(visibility).toLowerCase() === "public";
}

/**
 * Team-based access applies only when the user has a team and is not a widget developer.
 * Mirrors: userTeamId && userRole !== 'widget developer'
 */
export function shouldIncludeTeamAccessRule({ userRole, userTeamId }) {
  return Boolean(userTeamId) && userRole !== "widget developer";
}

/**
 * Whether a widget row would pass getAllWidgets WHERE (... OR ... OR ...).
 *
 * @param {{ widget_id: number, visibility?: string | null }} widget
 * @param {{
 *   userId?: number | null,
 *   userRole?: string | null,
 *   userTeamId?: number | null,
 *   userLinkedWidgetIds?: Iterable<number>,
 *   teamLinkedWidgetIds?: Iterable<number>,
 * }} context
 */
export function widgetPassesGetAllWidgetsFilter(widget, context) {
  const {
    userId = null,
    userRole = null,
    userTeamId = null,
    userLinkedWidgetIds = [],
    teamLinkedWidgetIds = [],
  } = context;

  const userWidgets = new Set(userLinkedWidgetIds);
  const teamWidgets = new Set(teamLinkedWidgetIds);

  if (isPublicVisibility(widget.visibility)) {
    return true;
  }

  if (userId != null && userWidgets.has(widget.widget_id)) {
    return true;
  }

  if (
    shouldIncludeTeamAccessRule({ userRole, userTeamId }) &&
    teamWidgets.has(widget.widget_id)
  ) {
    return true;
  }

  return false;
}

/**
 * Name search is an extra AND on top of access — never a substitute for it.
 *
 * @param {{ widget_name?: string | null }} widget
 * @param {string | null | undefined} widgetName
 */
export function widgetPassesNameFilter(widget, widgetName) {
  if (widgetName == null || String(widgetName).trim() === "") return true;
  const haystack = String(widget.widget_name || "").toLowerCase();
  return haystack.includes(String(widgetName).toLowerCase());
}

/**
 * Filter a widget list the same way getAllWidgets base query would (before pagination/categories).
 *
 * @param {Array<{ widget_id: number, visibility?: string | null, widget_name?: string | null }>} widgets
 * @param {Parameters<typeof widgetPassesGetAllWidgetsFilter>[1] & { widgetName?: string | null }} context
 */
export function filterWidgetsForGetAllWidgets(widgets, context) {
  const { widgetName, ...accessContext } = context;
  return widgets.filter(
    (widget) =>
      widgetPassesGetAllWidgetsFilter(widget, accessContext) &&
      widgetPassesNameFilter(widget, widgetName)
  );
}

/**
 * Summarize which access paths are active for a user — useful for SQL/query construction tests.
 */
export function getGetAllWidgetsAccessPaths({ userId, userRole, userTeamId }) {
  return {
    public: true,
    userWidget: userId != null,
    teamAccess: shouldIncludeTeamAccessRule({ userRole, userTeamId }),
  };
}

/**
 * Who the widget catalog is built for.
 * Always use the logged-in session. A client-supplied query userId is ignored
 * so Team B cannot fetch Team A's private widgets by impersonating an id.
 *
 * @param {{ sessionUserId?: unknown, queryUserId?: unknown }} [input]
 * @returns {number | null}
 */
export function resolveWidgetListViewer({ sessionUserId, queryUserId } = {}) {
  void queryUserId;
  if (sessionUserId == null || sessionUserId === "") return null;
  const parsed = Number(sessionUserId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Same catalog rules, plus site admins, for execute / export / listings.
 * sessionUser is the Express session user (or null if not logged in).
 *
 * @param {{
 *   sessionUser?: { user_id?: number, role?: string, team_id?: string } | null,
 *   widget: { widget_id: number, visibility?: string | null },
 *   userLinked?: boolean,
 *   teamLinked?: boolean,
 * }} input
 */
export function userCanAccessWidget({
  sessionUser = null,
  widget,
  userLinked = false,
  teamLinked = false,
}) {
  if (!widget) return false;
  if (sessionUser?.role === "admin") return true;

  const userId = sessionUser?.user_id ?? null;
  return widgetPassesGetAllWidgetsFilter(widget, {
    userId,
    userRole: sessionUser?.role ?? null,
    userTeamId: sessionUser?.team_id ?? null,
    userLinkedWidgetIds: userLinked && userId != null ? [widget.widget_id] : [],
    teamLinkedWidgetIds: teamLinked ? [widget.widget_id] : [],
  });
}
