import { fetchLeaders, fetchStandings } from "@/api/league";
import { setLeagueLeaders, setStandings } from "@/lib/widgetStore";
import { useState } from "react";

export default function useQueryLeague() {
  const [standingsLoading, setStandingsLoading] = useState(false);
  const [leadersLoading, setLeadersLoading] = useState(false);

  const loadStandings = async () => {
    try {
      setStandingsLoading(true);
      const standings = await fetchStandings();
      console.log(standings);
      setStandings(standings);
    } catch (error) {
      console.error("Error fetching standings:", error);
    } finally {
      setStandingsLoading(false);
    }
  };

  const loadLeagueLeaders = async () => {
    try {
      setLeadersLoading(true);
      const leaders = await fetchLeaders();
      console.log(leaders);
      setLeagueLeaders(leaders);
    } catch (error) {
      console.error("Error fetching league leaders:", error);
    } finally {
      setLeadersLoading(false);
    }
  };

  return { standingsLoading, loadStandings, leadersLoading, loadLeagueLeaders };
}
