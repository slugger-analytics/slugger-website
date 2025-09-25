import pool from "../db.js";
import bcrypt from 'bcryptjs';
import { signUpUserWithCognito } from "./userService.js";
import { generateApiKeyForUser } from "./widgetService.js";
import { sendApiKeyEmail } from "./emailService.js";
import cognito from "../cognito.js";

export async function createPendingDeveloper(userData) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Hash the password for database storage
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);
    
    // Create pending developer record with both passwords
    const pendingResult = await client.query(`
      INSERT INTO pending_developers 
      (email, first_name, last_name, password_hash, original_password, status, created_at)
      VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP)
      RETURNING request_id
    `, [userData.email, userData.firstName, userData.lastName, passwordHash, userData.password]);

    await client.query('COMMIT');
    return pendingResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function approveDeveloper(requestId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get pending developer details
    const developerResult = await client.query(`
      SELECT * FROM pending_developers WHERE request_id = $1
    `, [requestId]);

    if (developerResult.rowCount === 0) {
      throw new Error('Pending developer not found');
    }

    const developer = developerResult.rows[0];

    // Create user in Cognito and database
    const signUpResult = await signUpUserWithCognito({
      email: developer.email,
      password: developer.original_password,
      firstName: developer.first_name,
      lastName: developer.last_name,
      role: 'widget developer'
    });

    // Add auto-confirmation
    const confirmParams = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: developer.email,
    };
    
    await cognito.adminConfirmSignUp(confirmParams).promise();

    // Generate API key
    const apiKey = await generateApiKeyForUser(signUpResult.userId, developer.email);

    // Send API key email
    await sendApiKeyEmail(developer.email, apiKey);

    // Remove from pending_developers
    await client.query(`
      DELETE FROM pending_developers WHERE request_id = $1
    `, [requestId]);

    await client.query('COMMIT');
    return { apiKey, userId: signUpResult.userId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function declineDeveloper(requestId) {
  const client = await pool.connect();
  try {
    await client.query(
      `DELETE FROM pending_developers WHERE request_id = $1`,
      [requestId]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function disableCognitoAccount(email) {
    const params = {
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        Username: email,
    };

    try {
        await cognito.adminDisableUser(params).promise();
        console.log(`Successfully disabled Cognito account for ${email}`);
    } catch (error) {
        console.error(`Error disabling Cognito account for ${email}:`, error);
        throw error;
    }
}

export async function getPendingDevelopers() {
  const result = await pool.query(`
    SELECT pd.*, u.email 
    FROM pending_developers pd
    JOIN users u ON pd.user_id = u.user_id
    WHERE pd.status = 'pending'
    ORDER BY pd.created_at DESC
  `);
  return result.rows;
} 