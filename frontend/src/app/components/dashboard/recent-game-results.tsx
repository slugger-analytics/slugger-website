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

    // Render each game using the presentational component as horizontal tiles
    return (
        <div className="flex gap-3 overflow-x-auto py-2">
            {games.map((g: RecentGame, idx: number) => (
                <RecentGameResult key={g.game_id ?? idx} game={g} />
            ))}
        </div>
    );
}