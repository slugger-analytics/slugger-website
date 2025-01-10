/**
 * Entry point for the Express.js backend server.
 * This file sets up middleware, routes, and starts the server.
 */

import express, { json } from "express"; // Express.js framework for creating APIs
import cors from "cors"; // Middleware to enable Cross-Origin Resource Sharing
import dotenv from "dotenv"; // For managing environment variables
dotenv.config(); // Load environment variables from a `.env` file

// Importing API route handlers
import registerUserRoute from "./api/register-user.js";
import loginUserRoute from "./api/login-user.js";
import fetchUserByCognitoId from "./api/fetch-user.js";
import userFavoritesRouter from "./api/user-favorites.js";
import widgets from "./api/widgets.js";

// Initialize the Express app
const app = express();

// ---------------------------------------------------
// Middleware Setup
// ---------------------------------------------------

/**
 * Enable CORS (Cross-Origin Resource Sharing).
 * Required if the frontend and backend are hosted on different domains or ports.
 */
app.use(cors());

/**
 * Parse incoming JSON requests.
 * Adds the parsed data to `req.body`.
 */
app.use(json());

// ---------------------------------------------------
// API Routes
// ---------------------------------------------------

app.use("/api/widgets", widgets);

/**
 * Route: `/api/register-user`
 * Handles user registration requests.
 */
app.use("/api/register-user", registerUserRoute);

/**
 * Route: `/api/login-user`
 * Handles user login requests.
 */
app.use("/api/login-user", loginUserRoute);

/**
 * Route: `/api/fetch-user`
 * Fetches user details by Cognito ID.
 */
app.use("/api/fetch-user", fetchUserByCognitoId);

/**
 * Route: `/api/user-favorites`
 * Manages user favorites, such as adding or removing widgets.
 */
app.use("/api/user-favorites", userFavoritesRouter);

// ---------------------------------------------------
// Root Route
// ---------------------------------------------------

/**
 * Route: `/`
 * Health check route to ensure the server is running.
 */
app.get("/", (req, res) => {
  res.send("Server is running");
});

// ---------------------------------------------------
// Server Initialization
// ---------------------------------------------------

/**
 * The port on which the server will run.
 * Defaults to 3001 if not specified in the environment variables.
 */
const PORT = process.env.PORT || 3001;

/**
 * Start the server and listen for incoming requests.
 */
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
