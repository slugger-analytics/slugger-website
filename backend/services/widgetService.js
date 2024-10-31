const AWS = require('aws-sdk');
const apiGateway = new AWS.APIGateway({ region: 'us-east-2' });
const db = require('../db');

// Function to register a widget
async function registerWidget(user_id, widgetName, description, visibility) {
    const query = `
      INSERT INTO requests (user_id, widget_name, description, visibility, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING request_id;
      `;
    try {
        // Insert the widget into the database
        console.log("MADE IT INSIDE THE REGISTER WIDGET WIDGETSERVICE RAHHH")
        const status = 'pending'
        const result = await db.query(query, [user_id, widgetName, description, visibility, status]);
        const widgetId = result.rows[0].widget_id;
        console.log(`Widget registered with ID: ${widgetId}`);
        
        return { widgetId, message: 'Widget saved successfully and pending approval' };
    } catch (error) {
        console.error('Error registering widget:', error);
        throw new Error('Failed to register widget');
    }
}

async function removeRequest(requestId) {
    const query = `DELETE FROM requests WHERE request_id = $1 RETURNING *;`;
    
    try {
        const result = await db.query(query, [requestId]);
        if (result.rows.length === 0) {
            throw new Error('Request not found or already deleted.');
        }
        return result.rows[0]; // Return the deleted request data if necessary
    } catch (error) {
        console.error('Error deleting request:', error);
        throw error;
    }
}

async function createUserWidgetRelation(userId, widgetId, apiKey, role = 'owner') {
    try {
        const query = `
            INSERT INTO user_widget (user_id, widget_id, api_key, role, joined_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING *;
        `;
        const result = await db.query(query, [userId, widgetId, apiKey, role]);
        return result.rows[0]; // Return the newly created relation
    } catch (error) {
        console.error('Error creating user-widget relation:', error.message);
        throw error;
    }
}

async function generateApiKeyForUser(userId, email) {
    const params = {
        name: `ApiKey-${userId}`,
        description: `API key for ${email}`,
        enabled: true,
        generateDistinctId: true,
        stageKeys: [], // You can specify stages if needed
    };

    try {
        const apiKey = await apiGateway.createApiKey(params).promise();
        await associateApiKeyWithUsagePlan(apiKey.id, process.env.USAGE_PLAN_ID);
        await saveApiKeyToDatabase(userId, apiKey.id);
        return apiKey.id;
    } catch (err) {
        console.error('Error generating API Key:', err);
        throw new Error('Failed to generate API key');
    }
}

async function associateApiKeyWithUsagePlan(apiKeyId, usagePlanId) {
    const params = {
        keyId: apiKeyId, 
        keyType: 'API_KEY',
        usagePlanId: usagePlanId
    };

    try {
        await apiGateway.createUsagePlanKey(params).promise();
        console.log('API Key associated with Usage Plan');
    } catch (err) {
        console.error('Error associating API Key with Usage Plan:', err);
    }
}

async function saveApiKeyToDatabase(userId, apiKey) {
    const query = `
        UPDATE user_widget
        SET api_key = $1
        WHERE user_id = $2;
    `;
    await db.query(query, [apiKey, userId]);
}

async function getRequestData(requestId) {
    try {
        const query = `
            SELECT * FROM requests WHERE request_id = $1
        `;
        const result = await db.query(query, [requestId]);

        if (result.rows.length === 0) {
            throw new Error('Request not found');
        }

        return result.rows[0]; // Return the request data
    } catch (error) {
        console.error('Error fetching request data:', error.message);
        throw error;
    }
}

async function getUserData(userCognitoID) {
    try {
        const query = `
            SELECT * FROM users WHERE cognito_user_id = $1
        `;
        const result = await db.query(query, [userCognitoID]);

        if (result.rows.length === 0) {
            throw new Error('Request not found');
        }

        return result.rows[0]; // Return the user data
    } catch (error) {
        console.error('Error fetching request data:', error.message);
        throw error;
    }
}


async function createApprovedWidget(widgetData) {
    const { widget_name, description, visibility, user_id } = widgetData;
    try {
        const query = `
            INSERT INTO widgets (widget_name, description, visibility, status, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING widget_id;
        `;
        const result = await db.query(query, [widget_name, description, visibility, 'approved']);

        return result.rows[0]; // Return the newly created widget ID
    } catch (error) {
        console.error('Error creating approved widget:', error.message);
        throw error;
    }
}


async function getPendingWidgets() {
    const query = `
        SELECT * FROM requests`;
    const result = await db.query(query);
    return result.rows;
}

async function getAllWidgets() {
    const query = `
        SELECT * FROM widgets`;
    const result = await db.query(query);
    console.log(result)
    return result.rows;
}




module.exports = { generateApiKeyForUser, getPendingWidgets, registerWidget, getRequestData, getUserData, createApprovedWidget, createUserWidgetRelation, removeRequest, getAllWidgets};

