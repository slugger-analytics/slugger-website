/**
 * Utility functions for managing a user's favorite widgets.
 * Handles adding, removing, and retrieving favorite widget IDs stored in a PostgreSQL database.
 */

import pkg from "aws-sdk"; // Import AWS SDK
const { APIGateway, CognitoIdentityServiceProvider } = pkg; // Extract the API Gateway and CognitoIdentityServiceProvider classes
const apiGateway = new APIGateway({ region: "us-east-2" }); // Initialize API Gateway (not directly used in this code)
import crypto from "crypto";
import pool from "../db.js"; // PostgreSQL database connection
import dotenv from "dotenv";

dotenv.config();

const TOKEN_SECRET = process.env.TOKEN_SECRET;

const cognito = new CognitoIdentityServiceProvider({ region: "us-east-2" });

/**
 * Adds a widget to a user's list of favorite widgets.
 *
 * @param {number} userId - The ID of the user.
 * @param {number} widgetId - The ID of the widget to add to favorites.
 * @returns {Object} - An object containing the query result and a success or duplicate message.
 * @throws {Error} - If the database operation fails.
 */
export async function favoriteWidget(userId, widgetId) {
  const checkQuery = `
        SELECT fav_widgets_ids
        FROM users
        WHERE user_id = $1
    `;

  const addQuery = `
        UPDATE users
        SET fav_widgets_ids = array_append(fav_widgets_ids, $1)
        WHERE user_id = $2
    `;

  try {
    // Check if the widget is already in the user's favorites
    const { rows } = await pool.query(checkQuery, [userId]);

    if (rows[0]?.fav_widgets_ids.includes(widgetId)) {
      return { rows, message: "Widget already exists in favorites" };
    }

    // Add the widget to the user's favorites
    const result = await pool.query(addQuery, [widgetId, userId]);
    return {
      result,
      message: `Successfully added widget ${widgetId} as a favorite for user ${userId}`,
    };
  } catch (error) {
    console.error("Error favoriting widget:", error);
    throw new Error("Failed to favorite widget");
  }
}

/**
 * Removes a widget from a user's list of favorite widgets.
 *
 * @param {number} userId - The ID of the user.
 * @param {number} widgetId - The ID of the widget to remove from favorites.
 * @returns {Object} - An object containing the query result and a success message.
 * @throws {Error} - If the database operation fails.
 */
export async function unfavoriteWidget(userId, widgetId) {
  const removeQuery = `
        UPDATE users
        SET fav_widgets_ids = array_remove(fav_widgets_ids, $1)
        WHERE user_id = $2
    `;

  try {
    // Remove the widget from the user's favorites
    const result = await pool.query(removeQuery, [widgetId, userId]);
    return { result, message: "Widget unfavorited successfully" };
  } catch (error) {
    console.error("Error unfavoriting widget:", error);
    throw new Error("Failed to unfavorite widget");
  }
}

/**
 * Retrieves a user's list of favorite widget IDs.
 *
 * @param {number} userId - The ID of the user.
 * @returns {Object} - An object containing the user's favorite widget IDs and a success message.
 * @throws {Error} - If the database operation fails.
 */
export async function getFavorites(userId) {
  const selectQuery = `
        SELECT fav_widgets_ids
        FROM users
        WHERE user_id = $1
    `;

  try {
    // Fetch the user's favorite widget IDs
    const result = await pool.query(selectQuery, [userId]);
    const data = result.rows[0]?.fav_widgets_ids || []; // Return an empty array if no favorites are found
    return data;
  } catch (error) {
    console.error("Error fetching favorite widget ids:", error);
    throw new Error("Failed to fetch favorite widget ids");
  }
}

const algorithm = 'aes-256-cbc';
const iv = crypto.randomBytes(16); // Initialization vector

export function encryptToken(payload) {
  const cipher = crypto.createCipheriv(algorithm, TOKEN_SECRET, iv);
  let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export async function createUser(userData) {
  const {
    cognitoUserId,
    email,
    first,
    last,
    role,
    teamId = null,  // Default to null if not provided
    teamRole = null // Default to null if not provided
  } = userData;

  const query = `
    INSERT INTO users (
      cognito_user_id,
      email,
      first_name,
      last_name,
      role,
      team_id,
      team_role,
      is_admin,
      fav_widgets_ids,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    RETURNING *
  `;

  const values = [
    cognitoUserId,
    email,
    first,
    last,
    role,
    teamId,
    teamRole,
    false,  // is_admin defaults to false
    []      // empty fav_widgets_ids array
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

export async function signUpUserWithCognito(userData) {
  let { email, password, firstName, lastName, role, teamId, teamRole } = userData;
  email = email.toLowerCase();
  
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

    // Create user in database using existing createUser function
    const newUser = await createUser({
      cognitoUserId,
      email,
      first: firstName,
      last: lastName,
      role,
      teamId,
      teamRole
    });

    return {
      userId: newUser.user_id,
      cognitoUserId,
      user: newUser
    };
  } catch (error) {
    throw new Error(`Cognito signup failed: ${error.message}`);
  }
}
