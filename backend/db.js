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
 * 
 * Pool configuration is optimized for ECS Fargate:
 * - connectionTimeoutMillis: Time to wait for a connection from the pool
 * - idleTimeoutMillis: Close idle connections to prevent stale connections
 * - max: Maximum number of clients in the pool (default 10)
 * - min: Minimum number of clients to keep in the pool
 */
const pool = new Pool({
  user: process.env.DB_USERNAME, // The username for the database connection
  host: process.env.DB_HOST, // The host where the database is running
  database: process.env.DB_NAME, // The name of the database
  password: process.env.DB_PASSWORD, // The password for the database connection
  port: 5432, // The port on which PostgreSQL is running (default: 5432)
  
  // Connection pool settings optimized for health checks and concurrent requests
  max: 10, // Maximum number of connections in pool (default: 10)
  min: 2, // Keep 2 connections always open for fast health checks
  connectionTimeoutMillis: 10000, // Increased from 5s to 10s - allows time for initial connection
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  
  // Allow pool to create connections even if it takes time
  // This is important during container startup when DB might be slow to respond
  allowExitOnIdle: false, // Keep pool alive even if all connections are idle
});

// Handle pool errors gracefully to prevent crashes
// This catches errors on idle clients in the pool
pool.on('error', (err, client) => {
  console.error('Unexpected database pool error:', err);
  // Don't exit the process - the pool will attempt to recover
  // The health check will detect and report the issue to ALB
  // ALB will stop routing traffic until the issue is resolved
});

// Test initial database connection on startup
// This helps identify configuration issues early
pool.query('SELECT 1')
  .then(() => {
    console.log('✅ Database connection pool initialized successfully');
  })
  .catch((err) => {
    console.error('⚠️  Database connection pool failed initial test:', err.message);
    console.error('Application will continue running, but database operations will fail');
    console.error('Check your database configuration and network connectivity');
    // Don't exit - allow health checks to report the issue
  });

export default pool; // Export the pool for use in database queries
