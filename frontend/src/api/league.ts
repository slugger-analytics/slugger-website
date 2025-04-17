import dotenv from "dotenv";
import { LeagueLeadersData, LeagueStandingsData } from "@/data/types";

dotenv.config();

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function fetchStandings(): Promise<LeagueStandingsData> {
  try {
    const response = await fetch(`${API_URL}/api/league/standings`);
    const res = await response.json();

    if (!res.success) {
      throw new Error(res.message);
    }

    return res.data;
  } catch (error) {
    console.error("Error fetching standings:", error);
    throw error;
  }
}

export async function fetchLeaders(): Promise<LeagueLeadersData> {
  try {
    const response = await fetch(`${API_URL}/api/league/leaders`);
    const res = await response.json();

    if (!res.success) {
      throw new Error(res.message);
    }

    return res.data;
  } catch (error) {
    console.error("Error fetching league leaders:", error);
    throw error;
  }
}