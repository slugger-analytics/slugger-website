"use client";

import { RecentGame } from "@/api/games";

type Props = {
  game: RecentGame;
};

export default function RecentGameResult({ game }: Props) {
  // ---------- FIELD NORMALIZATION ----------
  const rawDate =
    game.date ||
    game.game_date ||
    game.gameDate ||
    game.created_at ||
    "";

  const home =
    game.home_team_name ||
    game.home_team ||
    game.home ||
    "Home";

  const away =
    game.visiting_team_name ||
    game.visiting_team ||
    game.away ||
    "Away";

  const homeScore =
    game.home_score ??
    game.home_team_score ??
    null;

  const awayScore =
    game.visiting_score ??
    game.away_score ??
    null;

  const status = game.game_status || "";
  const inningsPlayed = game.innings_played || null;
  const regulation = game.regulation_innings || null;
  const fieldName = game.field || game.ballpark_name || "";
  const gametime = game.gametime || "";
  const timezone = game.timezone || "";

  // ---------- FORMATTERS ----------
  const formatDate = (val: any) => {
    if (!val) return "";

    const s = String(val);
    const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(s);
    let d: Date;
    if (dateOnlyMatch) {
      const [y, m, day] = s.split("-").map((n) => parseInt(n, 10));
      d = new Date(y, m - 1, day); // local date at midnight
    } else {
      d = new Date(s);
    }

    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const formatStatus = () => {
    if (!status) return "";

    if (status.toLowerCase().includes("final")) {
      return "Final";
    }

    if (status.toLowerCase().includes("in progress")) {
      if (inningsPlayed) return `In Progress — ${inningsPlayed} inn`;
      return "In Progress";
    }

    if (status.toLowerCase().includes("scheduled")) {
      if (gametime) return `Scheduled — ${gametime} ${timezone}`;
      return "Scheduled";
    }

    return status;
  };

  const date = formatDate(rawDate);
  const statusText = formatStatus();

  // ---------- RENDER ----------
  return (
    <div className="min-w-[280px] w-56 flex-shrink-0 p-3 bg-white rounded-lg border border-gray-300 shadow-sm">
      {/* DATE */}
      <div className="mb-1 text-xs text-gray-500">{date}</div>

      {/* STATUS */}
      {statusText && (
        <div className="mb-2 text-[11px] text-blue-600 font-medium uppercase tracking-wide">
          {statusText}
        </div>
      )}

      {/* TEAM NAMES */}
      <div className="mb-2">
        <div className="text-sm font-medium truncate">
          {away} <span className="text-gray-400">@</span> {home}
        </div>
        <div className="text-xs text-gray-500 truncate">{fieldName}</div>
      </div>

      {/* SCORE */}
      <div className="mt-auto text-lg font-semibold flex justify-center items-center">
        <span className="mr-2">{awayScore ?? "-"}</span>
        <span className="text-gray-400">—</span>
        <span className="ml-2">{homeScore ?? "-"}</span>
      </div>
    </div>
  );
}
