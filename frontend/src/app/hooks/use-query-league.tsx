import { fetchLeaders, fetchStandings } from "@/api/league";
import { setLeagueLeaders, setStandings } from "@/lib/widgetStore";
import { useState } from "react";

export default function useQueryLeague() {
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [standingsError, setStandingsError] = useState<string | null>(null);
  const [leadersLoading, setLeadersLoading] = useState(false);
  const [leadersError, setLeadersError] = useState<string | null>(null);

  const loadStandings = async (year?: string) => {
    try {
      setStandingsLoading(true);
      setStandingsError(null);
      const standings = await fetchStandings(year);
      setStandings(standings);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Data unavailable for this season.";
      setStandingsError(msg);
      console.error("Error fetching standings:", error);
    } finally {
      setStandingsLoading(false);
    }
  };

  const loadLeagueLeaders = async (year?: string) => {
    try {
      setLeadersLoading(true);
      setLeadersError(null);
      const leaders = await fetchLeaders(year);
      setLeagueLeaders(leaders);
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Data unavailable for this season.";
      setLeadersError(msg);
      console.error("Error fetching league leaders:", error);
    } finally {
      setLeadersLoading(false);
    }
  };

  return {
    standingsLoading,
    standingsError,
    loadStandings,
    leadersLoading,
    leadersError,
    loadLeagueLeaders,
  };
}
