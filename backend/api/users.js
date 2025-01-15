import { Router } from "express";
import { validationMiddleware } from "../middleware/validation-middleware.js";
import pkg from "aws-sdk";
import dotenv from "dotenv";
import pool from "../db.js";
import {
  favoriteWidget,
  getFavorites,
  unfavoriteWidget,
} from "../services/userService.js";
import { getUserData } from "../services/widgetService.js";

dotenv.config();
const { CognitoIdentityServiceProvider } = pkg;
const cognito = new CognitoIdentityServiceProvider({
  region: process.env.AWS_REGION,
});
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
  const { email, password, firstName, lastName, role } = req.body;
  const params = {
    ClientId: process.env.COGNITO_APP_CLIENT_ID,
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: "email", Value: email },
      { Name: "given_name", Value: firstName },
      { Name: "family_name", Value: lastName },
    ],
  };
  try {
    const cognitoResult = await cognito.signUp(params).promise();
    const cognitoUserId = cognitoResult.UserSub;

    const query = `
      INSERT INTO users (cognito_user_id, email, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5) RETURNING user_id;
    `;
    const result = await pool.query(query, [
      cognitoUserId,
      email,
      firstName,
      lastName,
      role,
    ]);

    res.status(200).json({
      success: true,
      message: "User registered successfully",
      data: { userId: result.rows[0].user_id, cognitoUserId },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
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
    const { AccessToken, IdToken, RefreshToken } = authResult.AuthenticationResult;

    const query = "SELECT * FROM users WHERE email = $1";
    const dbResult = await pool.query(query, [email]);

    if (dbResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const user = dbResult.rows[0];
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        authData: { AccessToken, IdToken, RefreshToken },
        user,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
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

export default router;
