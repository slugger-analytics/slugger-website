import { Router } from "express";
import pkg from "aws-sdk";
import dotenv from "dotenv";
import pool from "../db.js";
import {
  encryptToken,
  favoriteWidget,
  getFavorites,
  unfavoriteWidget,
  createUser,
  signUpUserWithCognito,
  updateUser,
  deleteUser,
  getUserRole,
} from "../services/userService.js";
import { getUserData } from "../services/widgetService.js";
import { validationMiddleware } from "../middleware/validation-middleware.js";
import { generateTokenSchema } from "../validators/schemas.js";
import { sendPasswordResetEmail } from "../services/emailService.js";
import { requireAuth, requireSiteAdmin } from "../middleware/permission-guards.js";

dotenv.config();
const { CognitoIdentityServiceProvider } = pkg;
const cognito = new CognitoIdentityServiceProvider({
  region: "us-east-2",
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
const JWT_SECRET = process.env.JWT_SECRET;
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const router = Router();

/**
 * GET /users
 * Retrieve user data by ID.
 */
router.get("/", requireAuth, async (req, res) => {
  const { id } = req.body;
  try {
    const user = await getUserData(id);
    res.status(200).json({
      success: true,
      message: "User data retrieved successfully",
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /sign-up
 * Register a new user.
 */
router.post("/sign-up", async (req, res) => {
  try {
    const { role } = req.body;

    // Only allow non-privileged roles for public sign-up
    const allowedRoles = ["widget developer", "league"];

    if (!role || !allowedRoles.includes(role)) {
      res.status(400).json({
        success: false,
        message: "Invalid role. Allowed roles: widget developer, league"
      });
      return;
    }

    const result = await signUpUserWithCognito(req.body);
    res.status(200).json({
      success: true,
      message: "User registered successfully",
      userId: result.userId,
      data: result.user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error registering user"
    });
  }
});

/**
 * POST /sign-in
 * Authenticate a user.
 */
router.post("/sign-in", async (req, res) => {
  let { email, password } = req.body;
  email = email.toLowerCase();
  const params = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: process.env.COGNITO_APP_CLIENT_ID,
    AuthParameters: { USERNAME: email, PASSWORD: password },
  };
  try {
    const authResult = await cognito.initiateAuth(params).promise();
    const { AccessToken, IdToken, RefreshToken } =
      authResult.AuthenticationResult;

    const query = "SELECT * FROM users WHERE email = $1";
    let dbResult = await pool.query(query, [email]);
    
    let user;
    if (dbResult.rows.length === 0) {
      // User authenticated with Cognito but doesn't exist in DB
      // Check if they're a pending developer first
      const pendingCheck = await pool.query(
        'SELECT * FROM pending_developers WHERE email = $1',
        [email]
      );

      if (pendingCheck.rows.length > 0) {
        // This is a pending developer - they should not login until approved
        return res.status(403).json({
          success: false,
          message: "Your developer account is pending approval. Please wait for admin confirmation.",
        });
      }

      // Not a pending developer - auto-create with default role
      console.log(`Auto-creating user for ${email} after successful Cognito auth`);
      
      // Get user details from Cognito
      const cognitoUser = await cognito.getUser({ AccessToken }).promise();
      const firstName = cognitoUser.UserAttributes.find(attr => attr.Name === 'given_name')?.Value || '';
      const lastName = cognitoUser.UserAttributes.find(attr => attr.Name === 'family_name')?.Value || '';
      const cognitoUserId = cognitoUser.Username;
      
      // Create user in database
      user = await createUser({
        cognitoUserId,
        email,
        first: firstName,
        last: lastName,
        role: 'user' // Default role
      });
      
      console.log(`User created successfully: ${user.user_id}`);
    } else {
      user = dbResult.rows[0];
    }

    req.session.user = user; // IMPORTANT stores session in req body

    // Set accessToken as HTTP cookie for widget authentication
    // This enables widgets on the same domain to authenticate via cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const isLocalDev = process.env.LOCAL_DEV === 'true';
    const useSecureCookies = isProduction && !isLocalDev;
    
    res.cookie('accessToken', AccessToken, {
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: useSecureCookies ? 'none' : 'lax',
      maxAge: authResult.AuthenticationResult.ExpiresIn * 1000, // Convert seconds to milliseconds
      path: '/' // Available to all routes including /widgets/*
    });

    // Set user name cookie for widgets to display user's name
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
    res.cookie('sluggerUserName', fullName, {
      httpOnly: false, // Allow JavaScript access for display purposes
      secure: useSecureCookies,
      sameSite: useSecureCookies ? 'none' : 'lax',
      maxAge: authResult.AuthenticationResult.ExpiresIn * 1000,
      path: '/'
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        authData: {
          accessToken: AccessToken,
          idToken: IdToken,
          refreshToken: RefreshToken,
          expiresIn: authResult.AuthenticationResult.ExpiresIn // Token expiry in seconds (typically 3600)
        },
        user: {
          email: user.email,
          first: user.first_name,
          last: user.last_name,
          role: user.role,
          id: user.user_id,
          teamId: user.team_id,
          teamRole: user.team_role,
          is_admin: user.is_admin
        }
      },
    });
  } catch (error) {
    console.error('Sign-in error:', error);

    // Handle specific Cognito authentication errors
    if (error.code === 'NotAuthorizedException' || error.code === 'UserNotFoundException') {
      return res.status(401).json({
        success: false,
        message: "Incorrect username or password",
      });
    }

    // Handle other authentication-related errors
    if (error.code === 'UserNotConfirmedException') {
      return res.status(403).json({
        success: false,
        message: "User account is not confirmed",
      });
    }

    if (error.code === 'PasswordResetRequiredException') {
      return res.status(403).json({
        success: false,
        message: "Password reset required",
      });
    }

    // Generic server error for other issues
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/**
 * POST /refresh-token
 * Refresh access tokens using refresh token
 */
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: "Refresh token is required"
    });
  }

  const params = {
    AuthFlow: "REFRESH_TOKEN_AUTH",
    ClientId: process.env.COGNITO_APP_CLIENT_ID,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken
    }
  };

  try {
    const authResult = await cognito.initiateAuth(params).promise();
    const { AccessToken, IdToken, ExpiresIn } = authResult.AuthenticationResult;
    
    // Update accessToken cookie with refreshed token
    const isProduction = process.env.NODE_ENV === 'production';
    const isLocalDev = process.env.LOCAL_DEV === 'true';
    const useSecureCookies = isProduction && !isLocalDev;
    
    res.cookie('accessToken', AccessToken, {
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: useSecureCookies ? 'none' : 'lax',
      maxAge: ExpiresIn * 1000,
      path: '/'
    });
    
    // Note: Cognito doesn't return a new refresh token on refresh
    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: AccessToken,
        idToken: IdToken,
        expiresIn: ExpiresIn
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error.code === 'NotAuthorizedException') {
      return res.status(401).json({
        success: false,
        message: "Refresh token is invalid or expired. Please login again."
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to refresh token"
    });
  }
});

router.post('/logout', async (req, res) => {
  try {
    // If there's no data in the session, nothing to do
    if (!req.session || !req.session.user) {
      return res.status(200).json({ 
        success: true,
        message: 'Already logged out' 
      });
    }

    // Destroy the session in database
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({ error: 'Failed to complete logout' });
      }

      // Clear the session cookie
      res.clearCookie('connect.sid', {
        path: '/',
        httpOnly: true,
        secure: false, // TODO change to true for prod
        sameSite: 'strict'
      });

      res.status(200).json({ 
        success: true,
        message: 'Successfully logged out' 
      });
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error during logout' 
    });
  }
});

/**
 * PATCH /users/:userId/add-favorite
 * Add a widget to a user's favorites.
 */
router.patch("/add-favorite", requireAuth, async (req, res) => {
  const userId = req.session?.user?.user_id;
  const widgetId = parseInt(req.body.widgetId);
  try {
    const result = await favoriteWidget(userId, widgetId);
    res.status(201).json({
      success: true,
      message: "Widget added to favorites",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PATCH /users/:userId/remove-favorite
 * Remove a widget from a user's favorites.
 */
router.patch("/remove-favorite", requireAuth, async (req, res) => {
  const userId = req.session?.user?.user_id;
  const widgetId = parseInt(req.body.widgetId);
  try {
    const result = await unfavoriteWidget(userId, widgetId);
    res.status(200).json({
      success: true,
      message: "Widget removed from favorites",
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /users/:userId/favorite-widgets
 * Retrieve a user's favorite widgets.
 */
router.get("/favorite-widgets", requireAuth, async (req, res) => {
  const userId = req.session?.user?.user_id;
  try {
    const favorites = await getFavorites(userId);
    res.status(200).json({
      success: true,
      message: "Favorites retrieved successfully",
      data: favorites,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post("/validate-session", requireAuth, async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Session is valid"
  })
});

router.post("/generate-token", requireAuth, validationMiddleware(generateTokenSchema), async (req, res) => {
  const { userId, publicWidgetId } = req.body;
  try {
    // Ensure session is valid (w/ corresponding user)
    // if (req.session.user.user_id !== userId) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Invalid session"
    //   });
    // }

    const sessionIdRes = await pool.query(
      "SELECT sid FROM session WHERE (sess->'user'->>'user_id')::int = $1",
      [userId]
    );

    if (sessionIdRes.rowCount === 0) {
      return res.status(403).json({
        success: false,
        message: "Invalid session"
      });
    }

    const sessionId = sessionIdRes.rows[0].sid;

    // Lookup internal widget ID from public ID
    const widgetRes = await pool.query(
        "SELECT widget_id FROM widgets WHERE public_id = $1",
        [publicWidgetId]
    );

    if (widgetRes.rowCount === 0) {
      return res.status(403).json({
        success: false,
        message: "Widget not found",
      })
    }

    const widgetId = widgetRes.rows[0].widget_id;

    // const token = jwt.sign({ U: userId, p: publicWidgetId, s: sessionId }, JWT_SECRET, { expiresIn: "8h", algorithm: "HS256" });
    const token = encryptToken({
      userId,
      publicWidgetId,
      sessionId
    })
    res.json({
      success: true,
      message: "Token generated successfully",
      data: {
        token,
      }
    })
    res.status(200);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error generating token " + error.message 
    });
  }
})

router.get('/search', requireSiteAdmin, async (req, res) => {
  try {
    const { email } = req.query;
    
    const query = `
      SELECT user_id, email
      FROM users
      WHERE email = $1
    `;
    
    const result = await pool.query(query, [email]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
});

router.post('/send-password-reset-email', async (req, res) => {
  try {
    const { email, otp } = req.body;

    await sendPasswordResetEmail(email, otp);

    return res.json({
      success: true,
      message: "Email sent successfully!"
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
})

router.post('/reset-password', async (req, res) => {
  try {
    const { email, password } = req.body;
  
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const query = `
      SELECT cognito_user_id
      FROM users
      WHERE email = $1
    `;

    const result = await pool.query(query, [email.toLowerCase()]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const username = result.rows[0].cognito_user_id;

    try {
      const resetResponse = await cognito.adminSetUserPassword({
        Password: password,
        UserPoolId: COGNITO_USER_POOL_ID,
        Username: username,
        Permanent: true,
      }).promise(); // Use .promise() to handle the AWS SDK method correctly

      // If we reach here, the password reset was successful
      return res.status(200).json({
        success: true,
        message: 'Password reset successful'
      });

    } catch (cognitoError) {
      // Handle specific Cognito errors
      console.error('Cognito Password Reset Error:', cognitoError);

      if (cognitoError.code === 'NotAuthorizedException') {
        return res.status(400).json({
          success: false,
          message: 'Password does not meet requirements'
        });
      } else if (cognitoError.code === 'UserNotFoundException') {
        return res.status(404).json({
          success: false,
          message: 'Cognito user not found'
        });
      }

      // Generic error for other Cognito-related issues
      return res.status(500).json({
        success: false,
        message: 'Failed to reset password'
      });
    }

  } catch (error) {
    console.error('Password Reset Error:', error);
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
});

router.patch('/', requireAuth, async (req, res) => {
  const { first, last } = req.body;

  try {
    const id = req.session?.user?.user_id;

    // Ensure target user exists
    const selectUserById = `
      SELECT *
      FROM USERS
      WHERE user_id = $1
    `
    const targetUserRes = await pool.query(selectUserById, [id]);
    if (targetUserRes.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    await updateUser({
      id,
      first,
      last
    });

    res.status(200).json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`,
    });
  }
})

/**
 * DELETE /users
 * Delete a user account.
 *
 * Rules:
 * - All authenticated users can delete their own account (no userId parameter)
 * - Site admins can delete other users' accounts by providing userId parameter
 * - Non-admins cannot delete other users' accounts
 * - Site admins cannot delete other site admin accounts
 * - Site admins can delete their own account if no userId parameter is provided
 */
router.delete('/', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.session?.user?.user_id;
    const currentUserRole = req.session?.user?.role;
    const isSiteAdmin = currentUserRole === 'admin';

    // Get the target user ID from query parameter (optional)
    const targetUserId = req.query.userId ? parseInt(req.query.userId) : currentUserId;

    // If user is not an admin and trying to delete someone else's account, deny
    if (!isSiteAdmin && targetUserId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete other users'
      });
    }

    // If admin is trying to delete another user, check if target is also an admin
    if (isSiteAdmin && targetUserId !== currentUserId) {
      const targetUserRole = await getUserRole(targetUserId);

      if (targetUserRole === null) {
        return res.status(404).json({
          success: false,
          message: 'Target user not found'
        });
      }

      // Site admins cannot delete other site admin accounts
      if (targetUserRole === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Site admins cannot delete other site admin accounts'
        });
      }
    }

    // Proceed with deletion
    const result = await deleteUser(targetUserId);

    // If user deleted their own account, destroy the session before sending response
    if (targetUserId === currentUserId) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error after account deletion:', err);
          return res.status(500).json({
            success: false,
            message: `Internal error: Failed to destroy session: ${err.message}`
          });
        }

        // Clear the session cookie
        res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'none'
        });

        // Send response after session is destroyed and cookie is cleared
        res.status(200).json({
          success: true,
          message: result.message,
          data: {
            email: result.email,
            deletedSelf: true
          }
        });
      });
    } else {
      // Admin deleting another user - no session cleanup needed, send response immediately
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          email: result.email,
          deletedSelf: false
        }
      });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: `Internal error: ${error.message}`
    });
  }
});


export default router;
