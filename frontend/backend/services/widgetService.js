/**
 * Module for managing widget-related operations.
 * This file includes functionality for creating, updating, and retrieving widgets, 
 * managing user-widget relationships, and generating API keys via AWS API Gateway.
 */

import pkg from 'aws-sdk'; // Import AWS SDK
const { APIGateway } = pkg; // Extract the API Gateway service
const apiGateway = new APIGateway({ region: 'us-east-2' }); // Initialize API Gateway with the specified region
import pool from '../db.js'; // PostgreSQL database connection setup

// ---------------------------------------------------
// Widget Management Functions
// ---------------------------------------------------

/**
 * Registers a new widget and associates it with a user.
 * The widget is initially stored in the `requests` table with a 'pending' status.
 *
 * @param {number} user_id - The ID of the user registering the widget.
 * @param {string} widget_name - The name of the widget.
 * @param {string} description - A description of the widget.
 * @param {string} visibility - Visibility status ('public', 'private', etc.).
 * @param {object} widgetProps - Additional widget properties (currently unused).
 * @returns {object} - The registered widget ID and a success message.
 * @throws {Error} - Throws an error if the database operation fails.
 */
export async function registerWidget(user_id, widget_name, description, visibility, widgetProps) {
    const query = `
        INSERT INTO requests (user_id, widget_name, description, visibility, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING request_id;
    `;
    try {
        const status = 'pending';
        const result = await pool.query(query, [user_id, widget_name, description, visibility, status]);
        const widgetId = result.rows[0].widget_id;
        return { widgetId, message: 'Widget saved successfully and pending approval' };
    } catch (error) {
        console.error('Error registering widget:', error);
        throw new Error('Failed to register widget');
    }
}

/**
 * Updates an existing widget's information in the `widgets` table.
 *
 * @param {object} params - Object containing widget details.
 * @param {number} params.widgetId - The widget ID to update.
 * @param {string} params.widget_name - The updated widget name.
 * @param {string} params.description - The updated description.
 * @param {string} params.redirectLink - The updated redirect link.
 * @param {string} params.visibility - The updated visibility status.
 * @returns {object} - A result object and a success message.
 * @throws {Error} - Throws an error if the database operation fails.
 */
export async function updateWidget({ widgetId, widget_name, description, redirectLink, visibility }) {
    const editQuery = `
        UPDATE widgets
        SET widget_name = $1, description = $2, redirect_link = $3, visibility = $4
        WHERE widget_id = $5;
    `;
    try {
        const result = await pool.query(editQuery, [widget_name, description, redirectLink, visibility, widgetId]);
        return { result, message: "Widget edited successfully" };
    } catch (error) {
        console.error('Error updating widget:', error);
        throw new Error('Failed to update widget');
    }
}

/**
 * Deletes a widget request from the `requests` table by request ID.
 *
 * @param {number} requestId - The ID of the request to delete.
 * @returns {object} - The deleted request data if successful.
 * @throws {Error} - Throws an error if the request does not exist or the operation fails.
 */
export async function removeRequest(requestId) {
    const query = `DELETE FROM requests WHERE request_id = $1 RETURNING *;`;
    try {
        const result = await pool.query(query, [requestId]);
        if (result.rows.length === 0) {
            throw new Error('Request not found or already deleted.');
        }
        return result.rows[0];
    } catch (error) {
        console.error('Error deleting request:', error);
        throw error;
    }
}

// ---------------------------------------------------
// User-Widget Relationship Management
// ---------------------------------------------------

/**
 * Creates a relationship between a user and a widget in the `user_widget` table.
 *
 * @param {number} user_id - The user's ID.
 * @param {number} widgetId - The widget's ID.
 * @param {string} apiKey - The API key associated with the widget.
 * @param {string} role - The role of the user for the widget (default: 'owner').
 * @returns {object} - The newly created relationship record.
 * @throws {Error} - Throws an error if the database operation fails.
 */
export async function createUserWidgetRelation(user_id, widgetId, apiKey, role = 'owner') {
    const query = `
        INSERT INTO user_widget (user_id, widget_id, api_key, role, joined_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *;
    `;
    try {
        const result = await pool.query(query, [user_id, widgetId, apiKey, role]);
        return result.rows[0];
    } catch (error) {
        console.error('Error creating user-widget relation:', error.message);
        throw error;
    }
}

// ---------------------------------------------------
// API Key Management
// ---------------------------------------------------

/**
 * Generates an API key for a user via AWS API Gateway and associates it with a usage plan.
 *
 * @param {number} user_id - The user's ID.
 * @param {string} email - The user's email address.
 * @returns {string} - The generated API key ID.
 * @throws {Error} - Throws an error if the API key generation or association fails.
 */
export async function generateApiKeyForUser(user_id, email) {
    const params = {
        name: `ApiKey-${user_id}`,
        description: `API key for ${email}`,
        enabled: true,
        generateDistinctId: true,
        stageKeys: [],
    };

    try {
        const apiKey = await apiGateway.createApiKey(params).promise();

        if (!apiKey.id) {
            throw new Error('Failed to generate API key: no ID returned');
        }

        await associateApiKeyWithUsagePlan(apiKey.id, process.env.USAGE_PLAN_ID);
        await saveApiKeyToDatabase(user_id, apiKey.id);
        return apiKey.id;
    } catch (err) {
        console.error('Error generating API Key:', err);
        throw new Error('Failed to generate API key');
    }
}

/**
 * Associates an API key with a usage plan in AWS API Gateway.
 *
 * @param {string} apiKeyId - The API key ID.
 * @param {string} usagePlanId - The usage plan ID.
 * @throws {Error} - Throws an error if the association fails.
 */
export async function associateApiKeyWithUsagePlan(apiKeyId, usagePlanId) {
    const params = {
        keyId: apiKeyId,
        keyType: 'API_KEY',
        usagePlanId: usagePlanId,
    };

    try {
        await apiGateway.createUsagePlanKey(params).promise();
    } catch (err) {
        console.error('Error associating API Key with Usage Plan:', err);
        throw err;
    }
}

/**
 * Saves an API key to the database by updating the `user_widget` table.
 *
 * @param {number} user_id - The user's ID.
 * @param {string} apiKey - The API key.
 * @throws {Error} - Throws an error if the database operation fails.
 */
export async function saveApiKeyToDatabase(user_id, apiKey) {
    const query = `
        UPDATE user_widget
        SET api_key = $1
        WHERE user_id = $2;
    `;
    try {
        await pool.query(query, [apiKey, user_id]);
    } catch (error) {
        console.error('Error saving API key to database:', error.message);
        throw error;
    }
}

// ---------------------------------------------------
// Additional Data Fetching Functions
// ---------------------------------------------------

/**
 * Fetches data for a specific request from the `requests` table.
 *
 * @param {number} request_id - The request ID.
 * @returns {object} - The request data.
 * @throws {Error} - Throws an error if the request is not found or the operation fails.
 */
export async function getRequestData(request_id) {
    const query = `
        SELECT * FROM requests WHERE request_id = $1;
    `;
    try {
        const result = await pool.query(query, [request_id]);
        if (result.rows.length === 0) {
            throw new Error('Request not found');
        }
        return result.rows[0];
    } catch (error) {
        console.error('Error fetching request data:', error.message);
        throw error;
    }
}


