/**
 * Load a widget and enforce catalog access rules from the session.
 * Returns the widget row, or null after sending 400/401/403/404.
 */
import pool from "../db.js";
import { userCanAccessWidget } from "../lib/widgetAccess.js";

const SELECT_WIDGET = `
  SELECT widget_id, visibility
  FROM widgets
  WHERE widget_id = $1
`;

export async function assertCanAccessWidget(req, res, widgetId) {
  const parsed = parseInt(widgetId, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    res.status(400).json({ success: false, message: "Invalid widgetId" });
    return null;
  }

  const widgetResult = await pool.query(SELECT_WIDGET, [parsed]);
  if (widgetResult.rowCount === 0) {
    res.status(404).json({
      success: false,
      message: `Widget ${parsed} not found`,
    });
    return null;
  }

  const widget = widgetResult.rows[0];
  const sessionUser = req.session?.user ?? null;
  const allowed = await userHasWidgetAccess(sessionUser, widget);

  if (allowed) return widget;

  if (!sessionUser) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return null;
  }

  res.status(403).json({
    success: false,
    message: "Access denied",
  });
  return null;
}

/**
 * Same catalog rules as assertCanAccessWidget, for a user row loaded from the
 * database. Used when the caller is a widget backend, not the user's browser.
 */
export async function userHasWidgetAccess(user, widget) {
  if (!widget) return false;

  const userId = user?.user_id ?? null;
  let userLinked = false;
  let teamLinked = false;
  if (userId != null) {
    const linked = await pool.query(
      `SELECT 1 FROM user_widget WHERE widget_id = $1 AND user_id = $2 LIMIT 1`,
      [widget.widget_id, userId]
    );
    userLinked = linked.rowCount > 0;

    if (user.team_id) {
      const teamRow = await pool.query(
        `SELECT 1 FROM widget_team_access WHERE widget_id = $1 AND team_id = $2 LIMIT 1`,
        [widget.widget_id, user.team_id]
      );
      teamLinked = teamRow.rowCount > 0;
    }
  }

  return userCanAccessWidget({
    sessionUser: user,
    widget,
    userLinked,
    teamLinked,
  });
}

export async function requireWidgetAccess(req, res, next) {
  try {
    const widget = await assertCanAccessWidget(req, res, req.params.widgetId);
    if (!widget) return;
    req.accessibleWidget = widget;
    next();
  } catch (error) {
    console.error("Error verifying widget access:", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying widget access",
    });
  }
}
