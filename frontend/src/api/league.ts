import dotenv from "dotenv";
import { LeagueLeadersData, LeagueStandingsData } from "@/data/types";

dotenv.config();

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface SeasonOption {
  year: string;
  label: string;
  isCurrent: boolean;
}

export interface SeasonsData {
  seasons: SeasonOption[];
  currentYear: string;
}

export async function fetchSeasons(): Promise<SeasonsData> {
  try {
    const response = await fetch(`${API_URL}/api/league/seasons`);
    const res = await response.json();
    if (!res.success) throw new Error(res.message);
    return res.data as SeasonsData;
  } catch (error) {
    console.error("Error fetching seasons:", error);
    throw error;
  }
}

export async function fetchStandings(year?: string): Promise<LeagueStandingsData> {
  try {
    const url = year
      ? `${API_URL}/api/league/standings?year=${year}`
      : `${API_URL}/api/league/standings`;
    const response = await fetch(url);
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

export async function fetchLeaders(year?: string): Promise<LeagueLeadersData> {
  try {
    const url = year
      ? `${API_URL}/api/league/leaders?year=${year}`
      : `${API_URL}/api/league/leaders`;
    const response = await fetch(url);
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
