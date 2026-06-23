/**
 * Pure helpers for getAllWidgets visibility rules (public / user_widget / team access).
 * Mirrors the OR conditions in widgetService.getAllWidgets without DB access.
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
 * Filter a widget list the same way getAllWidgets base query would (before pagination/categories).
 *
 * @param {Array<{ widget_id: number, visibility?: string | null }>} widgets
 * @param {Parameters<typeof widgetPassesGetAllWidgetsFilter>[1]} context
 */
export function filterWidgetsForGetAllWidgets(widgets, context) {
  return widgets.filter((widget) => widgetPassesGetAllWidgetsFilter(widget, context));
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
