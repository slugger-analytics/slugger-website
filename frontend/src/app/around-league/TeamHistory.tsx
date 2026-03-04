"use client";

import React, { useEffect, useState } from "react";
import { fetchSeasons, fetchStandings } from "@/api/league";

type SeasonRecord = {
  year: string;
  division: string;
  wins: number;
  losses: number;
  pct: string;
  streak: string;
  last10: string;
};

function WinBar({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses;
  if (total === 0) return <span className="text-gray-300 text-xs">—</span>;
  const pct = wins / total;
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full bg-alpbBlue rounded-full transition-all"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{Math.round(pct * 100)}%</span>
    </div>
  );
}

type Props = {
  teamName: string;
};

const TeamHistory = ({ teamName }: Props) => {
  const [records, setRecords] = useState<SeasonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamName) return;

    setLoading(true);
    setError(null);
    setRecords([]);

    fetchSeasons()
      .then(({ seasons }) => {
        const years = seasons.map((s) => s.year);

        return Promise.allSettled(
          years.map((year) =>
            fetchStandings(year).then((data) => ({ year, data })),
          ),
        );
      })
      .then((results) => {
        const recs: SeasonRecord[] = [];

        for (const result of results) {
          if (result.status !== "fulfilled") continue;
          const { year, data } = result.value;

          for (const conf of data?.standings?.conference ?? []) {
            for (const div of conf.division ?? []) {
              const team = div.team.find((t) => t.teamname === teamName);
              if (team) {
                recs.push({
                  year,
                  division: div.name,
                  wins: parseInt(team.wins) || 0,
                  losses: parseInt(team.losses) || 0,
                  pct: team.pct,
                  streak: team.streak,
                  last10: team.last10,
                });
              }
            }
          }
        }

        recs.sort((a, b) => parseInt(b.year) - parseInt(a.year));
        setRecords(recs);
        setLoading(false);
      })
      .catch((err) => {
        console.error("TeamHistory fetch error:", err);
        setError("Could not load historical data.");
        setLoading(false);
      });
  }, [teamName]);

  const totalWins = records.reduce((s, r) => s + r.wins, 0);
  const totalLosses = records.reduce((s, r) => s + r.losses, 0);
  const totalGames = totalWins + totalLosses;
  const overallPct =
    totalGames > 0 ? (totalWins / totalGames).toFixed(3) : "—";
  const bestSeason = records.reduce<SeasonRecord | null>((best, r) => {
    if (!best) return r;
    return parseFloat(r.pct) > parseFloat(best.pct) ? r : best;
  }, null);

  return (
    <div className="flex flex-col bg-white p-6 rounded-xl shadow-sm border border-gray-100 w-full">

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 rounded-md bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-gray-400 italic text-sm py-4 text-center">{error}</p>
      )}

      {!loading && !error && records.length === 0 && (
        <p className="text-gray-400 italic text-sm py-4 text-center">
          No historical data found for {teamName}.
        </p>
      )}

      {!loading && !error && records.length > 0 && (
        <>
          {/* Summary strip */}
          <div className="flex flex-wrap gap-5 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Seasons</span>
              <span className="text-lg font-bold text-gray-800">{records.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">All-time W–L</span>
              <span className="text-lg font-bold text-gray-800">{totalWins}–{totalLosses}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">All-time PCT</span>
              <span className="text-lg font-bold text-gray-800">{overallPct}</span>
            </div>
            {bestSeason && (
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Best Season</span>
                <span className="text-lg font-bold text-gray-800">{bestSeason.year} <span className="text-sm font-normal text-gray-500">({bestSeason.pct})</span></span>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-left">Season</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-left">Division</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-center">W</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-center">L</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-center">PCT</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Win %</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-center">Streak</th>
                  <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-center">Last 10</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec, index) => (
                  <tr
                    key={rec.year}
                    className={`border-b border-gray-100 hover:bg-blue-50/40 transition-colors ${index % 2 === 1 ? "bg-gray-50" : "bg-white"}`}
                  >
                    <td className="px-4 py-2.5 font-semibold text-gray-800 tabular-nums">{rec.year}</td>
                    <td className="px-4 py-2.5 text-gray-600">{rec.division}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-gray-700">{rec.wins}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-gray-700">{rec.losses}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums font-medium text-gray-800">{rec.pct}</td>
                    <td className="px-4 py-2.5">
                      <WinBar wins={rec.wins} losses={rec.losses} />
                    </td>
                    <td className="px-4 py-2.5 text-center text-gray-600">{rec.streak || "—"}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-gray-600">{rec.last10 || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default TeamHistory;
