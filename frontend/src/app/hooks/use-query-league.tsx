import { fetchStandings } from "@/api/league";
import { setStandings } from "@/lib/store";
import { useState } from "react";

export default function useQueryLeague() {
    const [standingsLoading, setStandingsLoading] = useState(false);

      const loadStandings = async () => {
        try {
            setStandingsLoading(true);
            const standings = await fetchStandings();
            console.log(standings);
            setStandings(standings);
        } catch (error) {
          console.error("Error fetching widgets:", error);
        } finally {
          setStandingsLoading(false);
        }
      };

    return { standingsLoading, loadStandings };
}