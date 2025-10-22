/**
 * Ownership Guards - Resource ownership validation middleware
 * Provides middleware functions to verify user ownership of resources
 */

import pool from "../db.js";

/**
 * Middleware to require widget ownership or collaboration
 * Checks if the authenticated user is an owner or collaborator of the widget
 */
export const requireWidgetOwnership = async (req, res, next) => {
  const widgetId = parseInt(req.params.widgetId);
  const userId = req.session?.user?.user_id;

  if (isNaN(widgetId) || !userId) {
    return res.status(400).json({
      success: false,
      message: "Invalid widget ID"
    });
  }

  try {
    // Check if user is admin (admins can access any widget)
    if (req.session?.user?.role === 'admin') {
      return next();
    }

    // Check if user is owner or collaborator of the widget
    const query = `
      SELECT role FROM user_widget 
      WHERE widget_id = $1 AND user_id = $2
    `;
    
    const result = await pool.query(query, [widgetId, userId]);
    
    if (result.rowCount === 0) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You don't have permission to modify this widget"
      });
    }

    // Store the user's role for this widget in the request
    req.widgetUserRole = result.rows[0].role;
    next();
  } catch (error) {
    console.error("Error checking widget ownership:", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying widget access"
    });
  }
};

/**
 * Middleware to require widget ownership (owner only, not collaborators)
 * More restrictive than requireWidgetOwnership
 */
export const requireWidgetOwner = async (req, res, next) => {
  const widgetId = parseInt(req.params.widgetId);
  const userId = req.session?.user?.user_id;

  if (isNaN(widgetId) || !userId) {
    return res.status(400).json({
      success: false,
      message: "Invalid widget ID"
    });
  }

  try {
    // Check if user is admin (admins can access any widget)
    if (req.session?.user?.role === 'admin') {
      return next();
    }

    // Check if user is owner of the widget
    const query = `
      SELECT role FROM user_widget 
      WHERE widget_id = $1 AND user_id = $2 AND role = 'owner'
    `;
    
    const result = await pool.query(query, [widgetId, userId]);
    
    if (result.rowCount === 0) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Only widget owners can perform this action"
      });
    }

    next();
  } catch (error) {
    console.error("Error checking widget ownership:", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying widget access"
    });
  }
};

/**
 * Middleware to require team membership
 * Checks if the authenticated user belongs to the team specified in params
 */
export const requireTeamMembership = async (req, res, next) => {
  const teamId = req.params.teamId;
  const userId = req.session?.user?.user_id;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID"
    });
  }

  try {
    // Check if user is admin (admins can access any team)
    if (req.session?.user?.role === 'admin') {
      return next();
    }

    // Check if user belongs to the team
    if (req.session.user.team_id !== teamId) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You don't belong to this team"
      });
    }

    next();
  } catch (error) {
    console.error("Error checking team membership:", error);
    return res.status(500).json({
      success: false,
      message: "Error verifying team access"
    });
  }
};
