/**
 * Permission Guards - Role-based authorization middleware
 * Provides middleware functions to check user roles and permissions
 */


/**
 * Middleware to require admin privileges
 * Checks if the authenticated user has is_admin = true
 */
export const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  if (!(req.session.user.is_admin || req.session.user.role === 'master')) {
    return res.status(403).json({
      success: false,
      message: "Admin privileges required"
    });
  }

  next();
};

/**
 * Middleware to require widget developer role
 * Checks if the authenticated user has role = 'widget developer'
 */
export const requireWidgetDeveloper = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  if (req.session.user.role !== 'widget developer') {
    return res.status(403).json({
      success: false,
      message: "Widget developer privileges required"
    });
  }

  next();
};

/**
 * Middleware to require team manager role for a specific team
 * Checks if the authenticated user is a manager of the team specified in params
 */
export const requireTeamManager = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const teamId = req.params.teamId;
  const userId = req.session.user.user_id;

  // Check if user is admin (admins can manage any team)
  if (req.session.user.is_admin) {
    return next();
  }

  // Check if user is a manager of the specified team
  if (req.session.user.team_id !== teamId || !req.session.user.team_role.toLowerCase().includes('manager')) {
    return res.status(403).json({
      success: false,
      message: "Team manager privileges required for this team"
    });
  }

  next();
};

/**
 * Middleware to require admin OR widget developer role
 * Useful for endpoints that both admins and widget developers can access
 */
export const requireAdminOrWidgetDeveloper = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const isAdmin = req.session.user.is_admin;
  const isWidgetDeveloper = req.session.user.role === 'widget developer';

  if (!isAdmin && !isWidgetDeveloper) {
    return res.status(403).json({
      success: false,
      message: "Admin or widget developer privileges required"
    });
  }

  next();
};

/**
 * Middleware to require authentication (any logged-in user)
 */
export const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  next();
};
