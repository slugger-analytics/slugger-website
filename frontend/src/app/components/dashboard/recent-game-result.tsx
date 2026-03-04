"use client";

import { RecentScore } from "@/api/scores";

type Props = {
  game: RecentScore;
};

export default function RecentScoreResult({ game }: Props) {
  const rawDate      = game.date;
  const home         = game.home_team_name;
  const away         = game.visiting_team_name;
  const homeScore    = game.home_team_score;
  const awayScore    = game.visiting_team_score;
  const status       = game.game_status || "";
  const inningsPlayed = game.innings_played;
  const fieldName    = game.field;
  const gametime     = game.gametime || "";
  const timezone     = game.timezone || "";

  const isFinal      = status.toLowerCase().includes("final");
  const isLive       = status.toLowerCase().includes("in progress");
  const isScheduled  = status.toLowerCase().includes("scheduled");

  const homeWon = isFinal && homeScore != null && awayScore != null && homeScore > awayScore;
  const awayWon = isFinal && homeScore != null && awayScore != null && awayScore > homeScore;

  const formatDate = (val: unknown) => {
    if (!val) return "";
    const s = String(val);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split("-").map(Number);
      return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const statusBadge = () => {
    if (isFinal)     return { label: "Final",       cls: "bg-gray-100 text-gray-600" };
    if (isLive)      return { label: `Live · ${inningsPlayed ?? ""}`, cls: "bg-green-100 text-green-700 animate-pulse" };
    if (isScheduled) return { label: gametime ? `${gametime} ${timezone}` : "Scheduled", cls: "bg-blue-50 text-blue-600" };
    return { label: status, cls: "bg-gray-100 text-gray-500" };
  };

  const badge = statusBadge();

  return (
    <div className="w-full bg-white border border-gray-100 rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
      {/* Top row: date + status */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400">{formatDate(rawDate)}</span>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* Teams + scores */}
      <div className="flex flex-col gap-1.5">
        {/* Away team */}
        <div className="flex items-center justify-between">
          <span className={`text-sm truncate max-w-[160px] ${awayWon ? "font-bold text-gray-900" : "text-gray-500"}`}>
            {away}
          </span>
          <span className={`text-lg font-bold tabular-nums ${awayWon ? "text-gray-900" : "text-gray-400"}`}>
            {awayScore ?? "—"}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Home team */}
        <div className="flex items-center justify-between">
          <span className={`text-sm truncate max-w-[160px] ${homeWon ? "font-bold text-gray-900" : "text-gray-500"}`}>
            {home}
          </span>
          <span className={`text-lg font-bold tabular-nums ${homeWon ? "text-gray-900" : "text-gray-400"}`}>
            {homeScore ?? "—"}
          </span>
        </div>
      </div>

      {/* Venue */}
      {fieldName && (
        <p className="mt-2 text-[11px] text-gray-400 truncate">{fieldName}</p>
      )}
    </div>
  );
}
