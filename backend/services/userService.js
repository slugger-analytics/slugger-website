import pkg from 'aws-sdk';
const { APIGateway } = pkg;
const apiGateway = new APIGateway({ region: 'us-east-2' });
import pool from '../db.js';  // PostgreSQL connection 

export async function favoriteWidget(userId, widgetId) {
    const checkQuery = `
        SELECT fav_widgets_ids
        FROM users
        WHERE user_id = $1
    `
    const addQuery = `
        UPDATE users
        SET fav_widgets_ids = array_append(fav_widgets_ids, $1)
        WHERE user_id = $2
    `
    try {
        const { rows } = await pool.query(checkQuery, [userId]);
        console.log(rows[0]['fav_widgets_ids'])
        if (rows[0]?.fav_widgets_ids.includes(widgetId)) {
            return { rows, message: 'Widget already exists in favorites'};
        }
        const result = await pool.query(addQuery, [widgetId, userId]);
        return { result, message: `Successfully added widget ${widgetId} as a favorite for user ${userId}` };
    } catch (error) {
        console.error('Error favoriting widget:', error);
        throw new Error('Failed to favorite widget');
    }
}

export async function unfavoriteWidget(userId, widgetId) {
    const addQuery = `
        UPDATE users
        SET fav_widgets_ids = array_remove(fav_widgets_ids, $1)
        WHERE user_id = $2
    `
    try {
        const result = await pool.query(addQuery, [widgetId, userId]);
        return { result, message: "Widget unfavorited successfully" };
    } catch (error) {
        console.error('Error unfavoriting widget:', error);
        throw new Error('Failed to unfavorite widget');
    }
}