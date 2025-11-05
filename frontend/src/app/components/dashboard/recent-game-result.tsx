"use client";

import { RecentGame } from "@/api/games";

type Props = {
  game: RecentGame;
};

export default function RecentGameResult({ game }: Props) {
  // Field heuristics (kept in sync with the list component)
  const rawDate = game.game_date || game.date || game.gameDate || game.created_at || "";
  const home = game.home_team_name || game.home_team || game.home || "Home";
  const away = game.visiting_team_name || game.visiting_team || game.away || "Away";
  const homeScore = game.home_score ?? game.home_team_score ?? game.homeScore ?? null;
  const awayScore = game.visiting_score ?? game.away_score ?? game.visitingTeamScore ?? null;

  const formatDate = (val: any) => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    const datePart = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${datePart}`;
  };

  const date = formatDate(rawDate);

  return (
    <div className="min-w-[280px] w-56 flex-shrink-0 p-3 bg-white rounded-lg border border-gray-300 shadow-sm">
      <div className="mb-2 text-xs text-gray-500">{date}</div>

      <div className="mb-3">
        <div className="text-sm font-medium truncate">{away} <span className="text-gray-400">@</span> {home}</div>
        <div className="text-xs text-gray-500 truncate">{game.ballpark_name ?? ''}</div>
      </div>

      <div className="mt-auto text-lg font-semibold flex justify-center items-center">
        <span className="mr-2">{awayScore ?? "-"}</span>
        <span className="text-gray-400">—</span>
        <span className="ml-2">{homeScore ?? "-"}</span>
      </div>
    </div>
  );
}

