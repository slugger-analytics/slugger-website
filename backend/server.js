/**
 * Entry point for the Express.js backend server.
 * This file sets up middleware, routes, and starts the server.
 */

import express, { json } from "express"; // Express.js framework for creating APIs
import cors from "cors"; // Middleware to enable Cross-Origin Resource Sharing
import pool from "./db.js";
import session from "express-session";
import pgSession from "connect-pg-simple";
import dotenv from "dotenv"; // For managing environment variables
dotenv.config(); // Load environment variables from a `.env` file

// Importing API route handlers
import widgets from "./api/widgets.js";
import users from "./api/users.js";
import teams from "./api/teams.js";
import categories from "./api/widget-categories.js";
import developers from "./api/developers.js";
import league from "./api/league.js";
import auth from "./api/auth.js";
import teamAdmins from "./api/team-admins.js";
const SESSION_SECRET = process.env.SESSION_SECRET;

// Initialize the Express app
const app = express();

// ---------------------------------------------------
// Middleware Setup
// ---------------------------------------------------


app.use(cors({
  credentials: true,
  origin: ["https://alpb-analytics.com", "https://www.alpb-analytics.com", "http://localhost:3000"]
}))

/**
 * Parse incoming JSON requests.
 * Adds the parsed data to `req.body`.
 */
app.use(json());

const PostgresStore = pgSession(session);

// Create session store with error handling
const sessionStore = new PostgresStore({
  pool: pool,
  pruneSessionInterval: 60 * 15, // how often to clean up expired sessions from db (minutes)
  errorLog: (err) => {
    console.error('Session store error:', err);
    // Don't crash the server on session store errors
  }
});

app.use(
  session({
    store: sessionStore,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // TODO change to true for prod
      maxAge: 24 * 60 /*minutes*/ * 60 /*seconds*/ * 1000, // session length (ms)
      // maxAge: 1000 * 5 // TODO change back to normal amount!
    },
  }),
);

// ---------------------------------------------------
// API Routes
// ---------------------------------------------------

app.use("/api/widgets", widgets);

app.use("/api/users", users);

app.use("/api/teams", teams);

app.use("/api/widget-categories", categories);

app.use("/api/developers", developers);

app.use("/api/league", league);

app.use("/api/auth", auth);

app.use("/api/team-admins", teamAdmins);

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

/**
 * Route: `/api/health`
 * Health check endpoint for ALB and smoke tests.
 * Returns 200 OK with server status and database connectivity.
 * Returns 503 if database is unavailable to trigger health check failure.
 */
app.get("/api/health", async (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: "unknown"
  };

  // Check database connectivity
  try {
    await pool.query('SELECT 1');
    health.database = "connected";
    res.status(200).json(health);
  } catch (error) {
    console.error('Health check: Database connection failed:', error.message);
    console.error('Database config:', {
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      user: process.env.DB_USERNAME,
      port: process.env.DB_PORT || 5432
    });
    health.database = "disconnected";
    health.status = "unhealthy";
    health.error = error.message;
    // Return 503 Service Unavailable - triggers ALB health check failure
    res.status(503).json(health);
  }
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
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
