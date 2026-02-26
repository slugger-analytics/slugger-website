"use client";

import React, { useEffect, useState } from "react";
import { fetchSeasons, fetchStandings } from "@/api/league";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";

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
    <div className="flex flex-col bg-white p-6 rounded-lg shadow-sm border mb-8 w-[50%] max-w-[calc(100%-2rem)] min-w-[360px]">
      <h2 className="text-xl font-semibold mb-1">{teamName} — All Seasons</h2>
      <p className="text-xs text-gray-400 mb-5">Season-by-season standings record</p>

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
          <div className="flex gap-6 mb-5 text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Seasons</span>
              <span className="font-semibold">{records.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 uppercase tracking-wide">All-time W–L</span>
              <span className="font-semibold">{totalWins}–{totalLosses}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 uppercase tracking-wide">All-time PCT</span>
              <span className="font-semibold">{overallPct}</span>
            </div>
            {bestSeason && (
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Best Season</span>
                <span className="font-semibold">{bestSeason.year} ({bestSeason.pct})</span>
              </div>
            )}
          </div>

          <Table>
            <TableHeader className="bg-alpbBlue text-white">
              <TableRow className="hover:bg-transparent">
                <th className="border border-gray-300 p-2 text-left">Season</th>
                <th className="border border-gray-300 p-2 text-left">Division</th>
                <th className="border border-gray-300 p-2">W</th>
                <th className="border border-gray-300 p-2">L</th>
                <th className="border border-gray-300 p-2">PCT</th>
                <th className="border border-gray-300 p-2">Win %</th>
                <th className="border border-gray-300 p-2">Streak</th>
                <th className="border border-gray-300 p-2">Last 10</th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((rec) => (
                <TableRow key={rec.year} className="hover:bg-transparent">
                  <TableCell className="border border-gray-300 p-2 font-medium">
                    {rec.year}
                  </TableCell>
                  <TableCell className="border border-gray-300 p-2 text-sm text-gray-600">
                    {rec.division}
                  </TableCell>
                  <TableCell className="border border-gray-300 p-2 text-center">
                    {rec.wins}
                  </TableCell>
                  <TableCell className="border border-gray-300 p-2 text-center">
                    {rec.losses}
                  </TableCell>
                  <TableCell className="border border-gray-300 p-2 text-center">
                    {rec.pct}
                  </TableCell>
                  <TableCell className="border border-gray-300 p-2">
                    <WinBar wins={rec.wins} losses={rec.losses} />
                  </TableCell>
                  <TableCell className="border border-gray-300 p-2 text-center">
                    {rec.streak || "—"}
                  </TableCell>
                  <TableCell className="border border-gray-300 p-2 text-center">
                    {rec.last10 || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
};

export default TeamHistory;
