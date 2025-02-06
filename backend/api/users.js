import { Router } from "express";
import pkg from "aws-sdk";
import dotenv from "dotenv";
import pool from "../db.js";
import {
  encryptToken,
  favoriteWidget,
  getFavorites,
  unfavoriteWidget,
} from "../services/userService.js";
import { getUserData } from "../services/widgetService.js";
import authGuard from "../middleware/auth-guard.js";
import jwt from "jsonwebtoken";
import { getTeam } from "../services/teamService";
import { validationMiddleware } from "../middleware/validation-middleware.js";
import { generateTokenSchema } from "../validators/schemas.js";

dotenv.config();
const { CognitoIdentityServiceProvider } = pkg;
const cognito = new CognitoIdentityServiceProvider({
  region: process.env.AWS_REGION,
});
const JWT_SECRET = process.env.JWT_SECRET;
const router = Router();

/**
 * GET /users
 * Retrieve user data by ID.
 */
router.get("/", async (req, res) => {
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
  console.log("Sign-up request received:", req.body);
  const { email, password, firstName, lastName, role, inviteToken, teamId, teamRole } = req.body;
  
  try {
    let finalTeamId = null;

    if (inviteToken) {
      try {
        const decoded = jwt.verify(inviteToken, process.env.SESSION_SECRET);
        finalTeamId = decoded.teamId;
      } catch (err) {
        console.error("Invite token verification failed:", err);
        return res.status(400).json({
          success: false,
          message: "Invalid or expired invite link"
        });
      }
    } else if (teamId) {
      finalTeamId = teamId;
    }

    // Cognito signup
    const params = {
      ClientId: process.env.COGNITO_APP_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "given_name", Value: firstName },
        { Name: "family_name", Value: lastName }
      ]
    };

    try {
      const cognitoResult = await cognito.signUp(params).promise();
      const cognitoUserId = cognitoResult.UserSub;

      // Database insertion
      const query = `
        INSERT INTO users (cognito_user_id, email, first_name, last_name, role, team_id, team_role)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING user_id;
      `;

      const values = [
        cognitoUserId,
        email,
        firstName,
        lastName,
        'league',
        teamId,
        teamRole || 'Team Member'
      ];

      const result = await pool.query(query, values);

      res.status(200).json({
        success: true,
        message: "User registered successfully",
        userId: result.rows[0].user_id
      });
    } catch (cognitoError) {
      console.error("Cognito signup failed:", cognitoError);
      res.status(400).json({
        success: false,
        message: cognitoError.message || "Failed to create user account"
      });
    }
  } catch (error) {
    console.error("Server error during signup:", error);
    res.status(500).json({
      success: false,
      message: "Error registering user"
    });
  }
});

/**
 * POST /sign-in
 * Authenticate a user.
 */
router.post("/sign-in", async (req, res) => {
  const { email, password } = req.body;
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
    const dbResult = await pool.query(query, [email]);
    if (dbResult.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    const user = dbResult.rows[0];

    req.session.user = user; // IMPORTANT stores session in req body

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        authData: {
          acceessToken: AccessToken,
          idToken: IdToken,
          refreshToken: RefreshToken
        },
        user: {
          email: user.email,
          first: user.first_name,
          last: user.last_name,
          role: user.role,
          id: user.user_id,
          teamId: user.team_id,
          teamRole: user.team_role
        }
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.post('/logout', async (req, res) => {
  try {
    console.log("recieved")
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
router.patch("/:userId/add-favorite", async (req, res) => {
  const userId = parseInt(req.params.userId);
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
router.patch("/:userId/remove-favorite", async (req, res) => {
  const userId = parseInt(req.params.userId);
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
router.get("/:userId/favorite-widgets", async (req, res) => {
  const userId = parseInt(req.params.userId);
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

router.post("/validate-session", authGuard, async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Session is valid"
  })
});

router.post("/generate-token", authGuard, validationMiddleware(generateTokenSchema), async (req, res) => {
  const { userId, publicWidgetId } = req.body;
  console.log("session:", req.session)
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

    // Ensure user has access to this widget
    const widgetAccessRes = await pool.query(
      "SELECT * FROM user_widget WHERE user_id = $1 AND widget_id = $2",
      [userId, widgetId]
    );

    if (widgetAccessRes.rowCount === 0) {
      return res.status(403).json({
        success: false,
        message: "User does not have access to this widget"
      });
    }

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


export default router;
