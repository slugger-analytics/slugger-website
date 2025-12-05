import dotenv from "dotenv";
dotenv.config();

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type RecentScore = Record<string, any>;

export const fetchRecentScores = async (limit = 3): Promise<RecentScore[]> => {
  try {
    const response = await fetch(`${API_URL}/api/scores?limit=${limit}`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Error fetching scores: ${response.statusText}`);
    }

    const res = await response.json();
    if (!res.success) {
      throw new Error(res.message || "Failed to fetch scores");
    }

    return res.data || [];
  } catch (error) {
    console.error("fetchRecentScores error:", error);
    throw error;
  }
};
