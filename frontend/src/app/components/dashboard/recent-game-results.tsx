"use client";

import { useEffect, useState } from "react";
import { fetchRecentScores, RecentScore } from "@/api/scores";
import RecentGameResult from "./recent-game-result";

export default function RecentGameResults() {
    const [games, setGames] = useState<RecentScore[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const data = await fetchRecentScores(3);
                if (mounted) setGames(data);
            } catch (err: any) {
                console.error(err);
                if (mounted) setError(err.message || "Failed to load recent games");
            } finally {
                if (mounted) setLoading(false);
            }
        })();

        return () => {
            mounted = false;
        };
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center py-8 text-gray-400 text-sm gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
            Loading recent games…
        </div>
    );
    if (error) return (
        <div className="text-red-500 text-sm py-4 text-center">{error}</div>
    );
    if (!games || games.length === 0) return (
        <div className="text-gray-400 text-sm py-4 text-center">No recent games available</div>
    );

    return (
        <div className="flex flex-col gap-3">
            {games.map((g: RecentScore, idx: number) => (
                <RecentGameResult key={g.game_id ?? idx} game={g} />
            ))}
        </div>
    );
}

{/** mock data
    "use client";

import React from "react";
import RecentGameResult from "./recent-game-result";

// Temporary placeholder games
const MOCK_GAMES = [
  {
    game_id: 1,
    date: "2024-08-25",
    home_score: 5,
    visiting_score: 3,
    home_team: "Barnstormers",
    visiting_team: "Revolution",
    game_status: "Final",
    field: "Clipper Magazine Stadium",
  },
  {
    game_id: 2,
    date: "2024-08-24",
    home_score: 2,
    visiting_score: 4,
    home_team: "Ducks",
    visiting_team: "Blue Crabs",
    game_status: "Final",
    field: "Fairfield Properties Ballpark",
  },
  {
    game_id: 3,
    date: "2024-08-23",
    home_score: 8,
    visiting_score: 1,
    home_team: "Dirty Birds",
    visiting_team: "Honey Hunters",
    game_status: "Final",
    field: "GoMart Ballpark",
  },
];

export default function RecentGameResults() {
  return (
    <div className="flex gap-3 overflow-x-auto py-2">
      {MOCK_GAMES.map((g) => (
        <RecentGameResult key={g.game_id} game={g} />
      ))}
    </div>
  );
}
 */}