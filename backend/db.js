/**
 * Database connection setup for PostgreSQL using `pg` library.
 * This file initializes a connection pool to efficiently manage connections to the PostgreSQL database.
 */

import pkg from "pg"; // Import the `pg` package for PostgreSQL
const { Pool } = pkg; // Extract the Pool class for managing connections
import dotenv from "dotenv"; // Import dotenv for environment variable management

dotenv.config(); // Load environment variables from a `.env` file

/**
 * Creates a new connection pool to the PostgreSQL database.
 * The connection details are loaded from environment variables.
 */
const pool = new Pool({
  user: process.env.DB_USERNAME, // The username for the database connection
  host: process.env.DB_HOST, // The host where the database is running
  database: process.env.DB_NAME, // The name of the database
  password: process.env.DB_PASSWORD, // The password for the database connection
  port: 5432, // The port on which PostgreSQL is running (default: 5432)
  // Connection timeout and retry settings to prevent startup crashes
  connectionTimeoutMillis: 5000, // Timeout after 5 seconds
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
});

// Handle pool errors gracefully to prevent crashes
pool.on('error', (err, client) => {
  console.error('Unexpected database pool error:', err);
  // Don't exit the process - let health checks continue to work
});

export default pool; // Export the pool for use in database queries
