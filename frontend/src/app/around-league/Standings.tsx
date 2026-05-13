"use client";

import { $standings } from "@/lib/widgetStore";
import { useStore } from "@nanostores/react";
import React, { useState, useEffect } from "react";
import { ChevronsUpDown, ChevronUp, ChevronDown, Download } from "lucide-react";
import { Division, Team } from "@/data/types";
import useQueryLeague from "../hooks/use-query-league";

type SortKey = "teamname" | "wins" | "losses" | "pct";
type SortDir = "asc" | "desc";

const NORTH_TEAMS = ["Hagerstown Flying Boxcars", "Lancaster Stormers", "Long Island Ducks", "York Revolution", "Staten Island Ferry Hawks"];
const SOUTH_TEAMS = ["Southern Maryland Blue Crabs", "High Point Rockers", "Lexington Legends", "Gastonia Ghost Peppers", "Charleston Dirty Birds"];

function sortTeams(teams: Team[], key: SortKey, dir: SortDir): Team[] {
  return [...teams].sort((a, b) => {
    let diff = 0;
    switch (key) {
      case "wins":     diff = parseInt(a.wins)    - parseInt(b.wins);    break;
      case "losses":   diff = parseInt(a.losses)  - parseInt(b.losses);  break;
      case "pct":      diff = parseFloat(a.pct)   - parseFloat(b.pct);   break;
      case "teamname": diff = a.teamname.localeCompare(b.teamname);       break;
    }
    return dir === "asc" ? diff : -diff;
  });
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type StandingsProps = {
  season: string;
  maxTeams?: number;
  compact?: boolean;
  teamFilter?: string;
};

const Standings = ({ season, maxTeams, compact, teamFilter }: StandingsProps) => {
  const { loadStandings, standingsLoading, standingsError } = useQueryLeague();

  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [lastUpdated, setLastUpdated] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("pct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const allStandingsData = useStore($standings);

  useEffect(() => {
    if (allStandingsData?.standings?.conference) {
      // Pull all teams from the OVERALL conference, flattening all divisions
      const overall = allStandingsData.standings.conference.find(
        (conf) => conf.name === "OVERALL"
      );
      const teams = overall?.division.flatMap((d) => d.team) ?? [];
      setAllTeams(teams);

      const readableDate = new Date(allStandingsData.updatedAt).toLocaleString("en-US", {
        year: "numeric", month: "long", day: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true,
      });
      setLastUpdated(readableDate);
    }
  }, [allStandingsData]);

  useEffect(() => {
    loadStandings(season || undefined);
  }, [season, loadStandings]);

  // Split into hardcoded divisions
  const northTeams = allTeams.filter((t) => NORTH_TEAMS.includes(t.teamname));
  const southTeams = allTeams.filter((t) => SOUTH_TEAMS.includes(t.teamname));

  const divisions = [
    { name: "North Division", teams: northTeams },
    { name: "South Division", teams: southTeams },
  ];

  const handleExport = () => {
    const header = ["Division", "Team", "W", "L", "PCT"];
    const rows: string[][] = [header];
    divisions.forEach(({ name, teams }) => {
      sortTeams(teams, sortKey, sortDir).forEach((team) => {
        rows.push([name, team.teamname, team.wins, team.losses, team.pct]);
      });
    });
    downloadCsv(`${season ? `${season}-` : ""}standings.csv`, rows);
  };

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "losses" || key === "teamname" ? "asc" : "desc");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (key !== sortKey) return <ChevronsUpDown className="opacity-30 shrink-0" size={11} />;
    return sortDir === "asc"
      ? <ChevronUp className="shrink-0" size={11} />
      : <ChevronDown className="shrink-0" size={11} />;
  };

  const colHead = (key: SortKey, label: string) =>
    compact ? (
      <th key={key} className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-right">
        {label}
      </th>
    ) : (
      <th
        key={key}
        className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer select-none hover:text-gray-700 transition-colors whitespace-nowrap text-right"
        onClick={() => handleSort(key)}
      >
        <span className="inline-flex items-center gap-0.5 justify-end">
          {label} {sortIcon(key)}
        </span>
      </th>
    );

  if (standingsLoading) {
    return (
      <div className={`${compact ? "" : "bg-white rounded-xl shadow-sm border border-gray-100 p-6"}`}>
        <div className="space-y-2 py-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 rounded bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (standingsError) {
    return (
      <div className={`${compact ? "" : "bg-white rounded-xl shadow-sm border border-gray-100 p-6"}`}>
        <p className="text-gray-400 italic text-sm py-6 text-center">Data unavailable for this season.</p>
      </div>
    );
  }

  return (
    <div className={`${compact ? "" : "bg-white rounded-xl shadow-sm border border-gray-100 w-full overflow-hidden"}`}>
      {!compact && (
        <div className="flex items-center justify-end px-5 pt-4 pb-3 border-b border-gray-100">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-alpbBlue hover:border-alpbBlue border border-gray-200 rounded-md px-3 py-1.5 transition-colors"
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {compact ? (
              <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-left">Team</th>
            ) : (
              <th
                className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-left cursor-pointer select-none hover:text-gray-700 transition-colors"
                onClick={() => handleSort("teamname")}
              >
                <span className="inline-flex items-center gap-0.5">
                  Team {sortIcon("teamname")}
                </span>
              </th>
            )}
            {colHead("wins",   "W")}
            {colHead("losses", "L")}
            {colHead("pct",    "PCT")}
          </tr>
        </thead>

        <tbody>
          {divisions.map(({ name, teams }) => {
            // Apply teamFilter if provided
            const base = teamFilter ? teams.filter((t) => t.teamname === teamFilter) : teams;
            const sorted = sortTeams(base, sortKey, sortDir);
            const displayed = maxTeams ? sorted.slice(0, maxTeams) : sorted;

            if (displayed.length === 0) return null;

            return (
              <React.Fragment key={name}>
                {/* Division header row */}
                {!compact && !teamFilter && (
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <td
                      colSpan={4}
                      className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400"
                    >
                      {name}
                    </td>
                  </tr>
                )}
                {displayed.map((team, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-gray-100 transition-colors hover:bg-blue-50/40 ${
                      teamFilter && team.teamname === teamFilter ? "bg-alpbBlue/5" : ""
                    }`}
                  >
                    <td className={`${compact ? "px-2 py-2" : "px-4 py-3"} font-medium text-gray-800`}>
                      {team.teamname}
                    </td>
                    <td className={`${compact ? "px-2 py-2 text-xs" : "px-3 py-3"} text-right tabular-nums text-gray-700`}>
                      {team.wins}
                    </td>
                    <td className={`${compact ? "px-2 py-2 text-xs" : "px-3 py-3"} text-right tabular-nums text-gray-700`}>
                      {team.losses}
                    </td>
                    <td className={`${compact ? "px-2 py-2 text-xs" : "px-3 py-3"} text-right tabular-nums font-semibold text-gray-800`}>
                      {team.pct}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {!compact && lastUpdated && (
        <p className="text-right text-[11px] text-gray-400 px-5 py-2.5 border-t border-gray-100">
          Updated {lastUpdated}
        </p>
      )}
    </div>
  );
};

export default Standings;