"use client";

import { fetchStandings } from "@/api/league";
import React, { useState, useEffect, useCallback } from "react";
import { ChevronsUpDown, ChevronUp, ChevronDown, Download } from "lucide-react";
import { Team } from "@/data/types";

type SortKey = "teamname" | "wins" | "losses" | "pct";
type SortDir = "asc" | "desc";
type Half = "full" | "first" | "second";

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

function pctNum(wins: string, losses: string): number {
  const w = parseInt(wins) || 0;
  const l = parseInt(losses) || 0;
  const g = w + l;
  return g > 0 ? w / g : 0;
}

function fmtPct(n: number): string {
  return n.toFixed(3);
}

type StandingsProps = {
  season: string;
  maxTeams?: number;
  compact?: boolean;
  teamFilter?: string;
};

function extractTeams(data: { standings?: { conference?: Array<{ name: string; division?: Array<{ team?: Team[] }> }> } }): Team[] {
  const overall = data?.standings?.conference?.find((c) => c.name === "OVERALL");
  return overall?.division?.flatMap((d) => d.team ?? []) ?? [];
}

const Standings = ({ season, maxTeams, compact, teamFilter }: StandingsProps) => {
  const [half, setHalf] = useState<Half>("full");
  const [fullTeams, setFullTeams] = useState<Team[]>([]);
  const [firstHalfTeams, setFirstHalfTeams] = useState<Team[] | null>(null);
  const [clinchFirstHalf, setClinchFirstHalf] = useState<string[]>([]);
  const [clinchSecondHalf, setClinchSecondHalf] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("pct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fullData, firstHalfData] = await Promise.allSettled([
        fetchStandings(season || undefined, "full"),
        fetchStandings(season || undefined, "first"),
      ]);

      if (fullData.status === "fulfilled") {
        setFullTeams(extractTeams(fullData.value));
        setClinchFirstHalf(fullData.value.clinchFirstHalf ?? []);
        setClinchSecondHalf(fullData.value.clinchSecondHalf ?? []);
        const readableDate = new Date(fullData.value.updatedAt).toLocaleString("en-US", {
          year: "numeric", month: "long", day: "numeric",
          hour: "numeric", minute: "2-digit", hour12: true,
        });
        setLastUpdated(readableDate);
      } else {
        setError("Data unavailable for this season.");
      }

      if (firstHalfData.status === "fulfilled") {
        setFirstHalfTeams(extractTeams(firstHalfData.value));
      } else {
        setFirstHalfTeams(null);
      }
    } catch {
      setError("Data unavailable for this season.");
    } finally {
      setLoading(false);
    }
  }, [season]);

  useEffect(() => { load(); }, [load]);

  // Second-half = full-season minus first-half
  const secondHalfTeams: Team[] | null = firstHalfTeams && fullTeams.length > 0
    ? fullTeams.map((ft) => {
        const fh = firstHalfTeams.find((t) => t.teamname === ft.teamname);
        if (!fh) return ft;
        const w2 = Math.max(0, parseInt(ft.wins) - parseInt(fh.wins));
        const l2 = Math.max(0, parseInt(ft.losses) - parseInt(fh.losses));
        return {
          ...ft,
          wins: String(w2),
          losses: String(l2),
          pct: fmtPct(pctNum(String(w2), String(l2))),
          gp: String(w2 + l2),
        };
      })
    : null;

  const activeTeams =
    half === "first"  ? (firstHalfTeams  ?? fullTeams) :
    half === "second" ? (secondHalfTeams ?? fullTeams) :
    fullTeams;

  const northTeams = activeTeams.filter((t) => NORTH_TEAMS.includes(t.teamname));
  const southTeams = activeTeams.filter((t) => SOUTH_TEAMS.includes(t.teamname));

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
    const suffix = half === "first" ? "first-half-" : half === "second" ? "second-half-" : "";
    downloadCsv(`${season ? `${season}-` : ""}${suffix}standings.csv`, rows);
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

  const hasHalfData = firstHalfTeams !== null;

  const activeClinched: string[] =
    half === "first"  ? clinchFirstHalf :
    half === "second" ? clinchSecondHalf :
    Array.from(new Set(clinchFirstHalf.concat(clinchSecondHalf)));

  if (loading) {
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

  if (error) {
    return (
      <div className={`${compact ? "" : "bg-white rounded-xl shadow-sm border border-gray-100 p-6"}`}>
        <p className="text-gray-400 italic text-sm py-6 text-center">Data unavailable for this season.</p>
      </div>
    );
  }

  return (
    <div className={`${compact ? "" : "bg-white rounded-xl shadow-sm border border-gray-100 w-full overflow-hidden"}`}>
      {!compact && (
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          {hasHalfData ? (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {(["first", "second", "full"] as Half[]).map((h) => (
                <button
                  key={h}
                  onClick={() => setHalf(h)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    half === h
                      ? "bg-white text-alpbBlue shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {h === "first" ? "1st Half" : h === "second" ? "2nd Half" : "Full Season"}
                </button>
              ))}
            </div>
          ) : (
            <div />
          )}

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
            const base = teamFilter ? teams.filter((t) => t.teamname === teamFilter) : teams;
            const sorted = sortTeams(base, sortKey, sortDir);
            const displayed = maxTeams ? sorted.slice(0, maxTeams) : sorted;

            if (displayed.length === 0) return null;

            return (
              <React.Fragment key={name}>
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
                {displayed.map((team, idx) => {
                  const hasClinched = activeClinched.includes(team.teamname);
                  return (
                    <tr
                      key={idx}
                      className={`border-b border-gray-100 transition-colors hover:bg-blue-50/40 ${
                        teamFilter && team.teamname === teamFilter ? "bg-alpbBlue/5" : ""
                      }`}
                    >
                      <td className={`${compact ? "px-2 py-2" : "px-4 py-3"} font-medium text-gray-800`}>
                        {hasClinched
                          ? <><span className="text-alpbBlue font-bold">x-</span>{team.teamname}</>
                          : team.teamname
                        }
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
                  );
                })}
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
