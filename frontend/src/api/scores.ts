import dotenv from "dotenv";
dotenv.config();

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type RecentScore = Record<string, any>;

export const fetchRecentScores = async (
  limit = 3,
  startDate?: string,
  endDate?: string
): Promise<RecentScore[]> => {
  try {
    const params = new URLSearchParams();

    params.append("limit", limit.toString());

    if (startDate) {
      params.append("startDate", startDate);
    }

    if (endDate) {
      params.append("endDate", endDate);
    }

    const response = await fetch(`${API_URL}/api/scores?${params.toString()}`, {
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
