import { Router } from 'express';
import pkg from 'aws-sdk';
import pool from '../db.js';  // Assuming you have db.js for PostgreSQL connection
import dotenv from 'dotenv';

const { CognitoIdentityServiceProvider } = pkg;
dotenv.config();

const router = Router();

// Configure AWS SDK
const cognito = new CognitoIdentityServiceProvider({
  region: process.env.AWS_REGION  // e.g., 'us-east-1'
});

router.post('/', async (req, res) => {
  const { email, password, firstName, lastName, role } = req.body;

  const params = {
    ClientId: process.env.COGNITO_APP_CLIENT_ID,  // Cognito App Client ID
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'given_name', Value: firstName },
      { Name: 'family_name', Value: lastName },
    ],
  };

  try {
    // Register the user with Cognito
    const cognitoResult = await cognito.signUp(params).promise();

    // Get Cognito User Sub ID
    const cognitoUserId = cognitoResult.UserSub;

    // Save the user in the database
    const insertUserQuery = `
      INSERT INTO users (cognito_user_id, email, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING user_id;
    `;
    const dbResult = await pool.query(insertUserQuery, [cognitoUserId, email, firstName, lastName, role]);

    // Return success response
    res.status(200).json({
      message: "User successfully registered and added to the database.",
      userId: dbResult.rows[0].user_id,
      cognitoUserId: cognitoUserId,
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;

