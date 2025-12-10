"use client";

import { useEffect, useState } from "react";
import { fetchRecentGames, RecentGame } from "@/api/games";
import RecentGameResult from "./recent-game-result";

export default function RecentGameResults() {
    const [games, setGames] = useState<RecentGame[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const data = await fetchRecentGames(3);
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

    if (loading) return <div>Loading recent games...</div>;
    if (error) return <div className="text-red-600">{error}</div>;
    if (!games || games.length === 0) return <div>No recent games available</div>;

    // Render each game using the presentational component as vertical tiles
    return (
        <div className="flex flex-col items-center gap-3 py-2 max-h-[400px] overflow-y-auto pr-4">
            {games.map((g: RecentGame, idx: number) => (
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