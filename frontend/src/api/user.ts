/**
 * Frontend API utility functions for managing user favorites.
 * Includes functions to add, remove, and fetch favorite widgets for a user.
 */
import { FavoritesAPIRes } from "@/data/types";
import dotenv from "dotenv";

dotenv.config();

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Adds a widget to a user's list of favorites.
 *
 * @param {number} userId - The ID of the user.
 * @param {number} widgetId - The ID of the widget to add to favorites.
 * @returns {Promise<Object>} - The response from the API if the addition is successful.
 * @throws {Error} - Throws an error if the API call fails or the response is not successful.
 */
export const addFavorite = async (userId: number, widgetId: number) => {
  try {
    const response = await fetch(
      `${API_URL}/api/users/${userId}/add-favorite`,
      {
        method: "PATCH", // HTTP PATCH request to update the user's favorites
        headers: { "Content-Type": "application/json" }, // Set the content type to JSON
        body: JSON.stringify({ widgetId }), // Send the widget ID in the request body
      },
    );

    const res = await response.json();

    if (!res.success) {
      // Handle unsuccessful responses
      throw new Error(`Error adding favorite: ${res.message}`);
    }

    return res.data;

    return await response.json(); // Parse and return the JSON response
  } catch (error) {
    console.error("Error adding widget to favorites:", error);
    throw error; // Rethrow the error for handling in the caller
  }
};

/**
 * Removes a widget from a user's list of favorites.
 *
 * @param {number} userId - The ID of the user.
 * @param {number} widgetId - The ID of the widget to remove from favorites.
 * @returns {Promise<Object>} - The response from the API if the removal is successful.
 * @throws {Error} - Throws an error if the API call fails or the response is not successful.
 */
export const removeFavorite = async (userId: number, widgetId: number) => {
  try {
    const response = await fetch(
      `${API_URL}/api/users/${userId}/remove-favorite`,
      {
        method: "PATCH", // HTTP PATCH request to update the user's favorites
        headers: { "Content-Type": "application/json" }, // Set the content type to JSON
        body: JSON.stringify({ widgetId }), // Send the widget ID in the request body
      },
    );

    const res = await response.json();

    if (!res.success) {
      // Handle unsuccessful responses
      throw new Error(`Error removing favorite: ${res.message}`);
    }

    return res.data;
  } catch (error) {
    console.error("Error removing widget from favorites:", error);
    throw error; // Rethrow the error for handling in the caller
  }
};

/**
 * Fetches the list of favorite widgets for a specific user.
 *
 * @param {number} userId - The ID of the user.
 * @returns {Promise<any[]>} - An array of favorite widget IDs if the fetch is successful.
 * @throws {Error} - Throws an error if the API call fails.
 */
export const getFavorites = async (userId: number) => {
  try {
    const response = await fetch(
      `${API_URL}/api/users/${userId}/favorite-widgets/`,
      {
        method: "GET", // HTTP GET request to retrieve user's favorites
      },
    );

    const res: FavoritesAPIRes = await response.json();

    if (!res.success) {
      // Handle unsuccessful responses
      throw new Error(`Error: ${res.message}`);
    }
    return res.data; // Return the array of favorite widget IDs
  } catch (error) {
    console.error("Error fetching favorite widgets:", error);
    throw error; // Rethrow the error for handling in the caller
  }
};

export const generateToken = async (userId: number, publicWidgetId: string) => {
  try {
    const response = await fetch(`${API_URL}/api/users/generate-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        userId,
        publicWidgetId,
      }),
    });

    const res = await response.json();

    console.log(res);

    if (!res.success) {
      throw new Error(res.message);
    }
    return res.data.token;
  } catch (error) {
    console.error("Error generating token:", error);
    throw error; // Rethrow the error for handling in the caller
  }
};
