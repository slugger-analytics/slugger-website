import dotenv from "dotenv";
dotenv.config();

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type RecentGame = Record<string, any>;

export const fetchRecentGames = async (limit = 3): Promise<RecentGame[]> => {
  try {
    const response = await fetch(`${API_URL}/api/games?limit=${limit}`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Error fetching games: ${response.statusText}`);
    }

    const res = await response.json();
    if (!res.success) {
      throw new Error(res.message || "Failed to fetch games");
    }

    return res.data || [];
  } catch (error) {
    console.error("fetchRecentGames error:", error);
    throw error;
  }
};
