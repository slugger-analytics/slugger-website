/**
 * Permission Guards - Role-based authorization middleware
 * Provides middleware functions to check user roles and permissions
 */


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
