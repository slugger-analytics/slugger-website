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
  const userId = sessionUser?.user_id ?? null;

  let userLinked = false;
  let teamLinked = false;
  if (userId != null) {
    const linked = await pool.query(
      `SELECT 1 FROM user_widget WHERE widget_id = $1 AND user_id = $2 LIMIT 1`,
      [parsed, userId]
    );
    userLinked = linked.rowCount > 0;

    if (sessionUser.team_id) {
      const teamRow = await pool.query(
        `SELECT 1 FROM widget_team_access WHERE widget_id = $1 AND team_id = $2 LIMIT 1`,
        [parsed, sessionUser.team_id]
      );
      teamLinked = teamRow.rowCount > 0;
    }
  }

  const allowed = userCanAccessWidget({
    sessionUser,
    widget,
    userLinked,
    teamLinked,
  });

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
