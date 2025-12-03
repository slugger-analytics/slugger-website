import pool from "../db.js";

/**
 * Create a new team admin request
 * User must be logged in and part of a team
 */
export async function createTeamAdminRequest(userId, teamId, is_admin) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (is_admin) {
      throw new Error('User is already a team admin');
    }

    // Try to create the new request, error if unique violation (duplicate pending request)
    try {
      await client.query(`
        INSERT INTO team_admin_requests (user_id, team_id, status, created_at)
        VALUES ($1, $2, 'pending', CURRENT_TIMESTAMP)
      `, [userId, teamId]);
    } catch (err) {
      if (err.code === '23505') { // unique_violation PG error code
        throw new Error('A pending request already exists for this user');
      }
      // Re-throw unexpected errors
      throw err;
    }

    await client.query('COMMIT');
    return { message: 'Team admin request created successfully' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all pending team admin requests
 */
export async function getPendingAdminRequests() {
  const result = await pool.query(`
    SELECT
      tar.request_id,
      tar.user_id,
      tar.team_id,
      tar.status,
      tar.created_at,
      u.email,
      u.first_name,
      u.last_name,
      t.team_name
    FROM team_admin_requests tar
    JOIN users u ON tar.user_id = u.user_id
    JOIN team t ON tar.team_id = t.team_id
    WHERE tar.status = 'pending'
    ORDER BY tar.created_at DESC
  `);
  return result.rows;
}

/**
 * Approve a team admin request
 * Sets user's is_admin to true and deletes the request
 */
export async function approveAdminRequest(requestId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get the request details
    const requestResult = await client.query(`
      SELECT user_id, team_id, status
      FROM team_admin_requests
      WHERE request_id = $1
    `, [requestId]);

    if (requestResult.rowCount === 0) {
      throw new Error('Admin request not found');
    }

    const request = requestResult.rows[0];

    if (request.status !== 'pending') {
      throw new Error('Request has already been processed');
    }

    // Update user's is_admin status
    const updateResult = await client.query(`
      UPDATE users
      SET is_admin = true, team_role = 'Team Admin'
      WHERE user_id = $1 AND team_id = $2
      RETURNING user_id, email, first_name, last_name, is_admin, team_role
    `, [request.user_id, request.team_id]);

    if (updateResult.rowCount === 0) {
      throw new Error('User not found or not part of the team');
    }

    // Delete the request
    await client.query(`
      DELETE FROM team_admin_requests
      WHERE request_id = $1
    `, [requestId]);

    await client.query('COMMIT');
    return updateResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Decline a team admin request
 * Deletes the request without making any changes to the user
 */
export async function declineAdminRequest(requestId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify request exists and is pending
    const requestResult = await client.query(`
      SELECT status FROM team_admin_requests
      WHERE request_id = $1
    `, [requestId]);

    if (requestResult.rowCount === 0) {
      throw new Error('Admin request not found');
    }

    if (requestResult.rows[0].status !== 'pending') {
      throw new Error('Request has already been processed');
    }

    // Delete the request
    await client.query(`
      DELETE FROM team_admin_requests
      WHERE request_id = $1
    `, [requestId]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all team admins across all teams
 */
export async function getAllTeamAdmins() {
  const result = await pool.query(`
    SELECT
      u.user_id,
      u.email,
      u.first_name,
      u.last_name,
      u.team_id,
      t.team_name,
      u.is_admin,
      u.created_at
    FROM users u
    JOIN team t ON u.team_id = t.team_id
    WHERE u.is_admin = true
    ORDER BY t.team_name, u.last_name, u.first_name
  `);
  return result.rows;
}

/**
 * Remove admin permissions from a user
 * Sets user's is_admin to false
 */
export async function removeAdminPermissions(userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify user exists and is currently an admin
    const userResult = await client.query(`
      SELECT user_id, is_admin, team_id
      FROM users
      WHERE user_id = $1
    `, [userId]);

    if (userResult.rowCount === 0) {
      throw new Error('User not found');
    }

    const user = userResult.rows[0];

    if (!user.is_admin) {
      throw new Error('User is not currently a team admin');
    }

    // Update user's is_admin status to false
    const updateResult = await client.query(`
      UPDATE users
      SET is_admin = false
      WHERE user_id = $1
      RETURNING user_id, email, first_name, last_name, is_admin, team_id
    `, [userId]);

    await client.query('COMMIT');
    return updateResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
