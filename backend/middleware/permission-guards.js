/**
 * Permission Guards - Role-based authorization middleware
 * Provides middleware functions to check user roles and permissions
 */

import pool from "../db.js";

/**
 * Middleware to refresh user's is_admin status from database
 * Ensures session always has current is_admin value
 */
export const refreshUserAdminStatus = async (req, res, next) => {
  if (!req.session?.user?.user_id) {
    return next();
  }

  try {
    const result = await pool.query(
      'SELECT is_admin, team_role FROM users WHERE user_id = $1',
      [req.session.user.user_id]
    );

    if (result.rows.length > 0) {
      const dbIsAdmin = result.rows[0].is_admin;
      const dbTeamRole = result.rows[0].team_role;
      
      // Only update if values have changed
      if (req.session.user.is_admin !== dbIsAdmin || req.session.user.team_role !== dbTeamRole) {
        req.session.user.is_admin = dbIsAdmin;
        req.session.user.team_role = dbTeamRole;
        
        // Save the session to persist changes
        req.session.save((err) => {
          if (err) console.error('Error saving session after admin status refresh:', err);
        });
      }
    }
  } catch (error) {
    console.error('Error refreshing user admin status:', error);
  }

  next();
};

/**
 * Middleware to require admin privileges
 * Checks if the authenticated user has role = 'admin'
 */
export const requireSiteAdmin = (req, res, next) => {
  if (req.session?.user?.role === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Site admin privileges required"
  });
};

/**
 * Middleware to require team admin privileges
 * Checks if the authenticated user has attribute is_admin = true
 */
export const requireTeamAdmin = (req, res, next) => {
  console.log("requireTeamAdmin check:", {
    is_admin: req.session?.user?.is_admin,
    user_id: req.session?.user?.user_id,
    full_user: req.session?.user
  });
  if (req.session?.user?.is_admin) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Team admin privileges required"
  });
};

/**
 * Middleware to require authentication (any logged-in user)
 */
export const requireAuth = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  next();
};
