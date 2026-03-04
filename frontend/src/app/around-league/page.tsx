"use client";
import React, { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Standings from "@/app/around-league/Standings";
import StatLeaders from "@/app/around-league/StatLeaders";
import SeasonDropdown from "@/app/around-league/SeasonDropdown";
import TeamDropdown from "@/app/around-league/TeamDropdown";
import TeamHistory from "@/app/around-league/TeamHistory";
import { AppSidebar } from "@/app/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/app/components/ui/sidebar";
import { Trophy, TrendingUp, History } from "lucide-react";

const SEASON_STORAGE_KEY = "selectedSeason";

function AroundLeagueContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [season, setSeason] = useState<string>("");
  const [teamFilter, setTeamFilter] = useState<string>("");

  useEffect(() => {
    const fromUrl = searchParams.get("season");
    if (fromUrl) { setSeason(fromUrl); return; }
    const fromStorage = localStorage.getItem(SEASON_STORAGE_KEY);
    if (fromStorage) setSeason(fromStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSeasonChange = useCallback(
    (year: string) => {
      setSeason(year);
      if (typeof window !== "undefined") localStorage.setItem(SEASON_STORAGE_KEY, year);
      const params = new URLSearchParams(searchParams.toString());
      params.set("season", year);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const standingsTitle = `${season ? `${season} ` : ""}Standings${teamFilter ? ` · ${teamFilter}` : ""}`;
  const leadersTitle   = `${season ? `${season} ` : ""}Stat Leaders${teamFilter ? ` · ${teamFilter}` : ""}`;

  return (
    <div className="w-full min-h-full">

      {/* ── CONTENT ── */}
      <div className="w-full max-w-6xl mx-auto px-10 py-4 flex flex-col gap-6">

        {/* Title + filters row */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-2xl pt-6 font-bold text-gray-900">Around the League</p>
            <p className="text-xs text-gray-400 mt-0.5">Standings, stat leaders &amp; team history</p>
          </div>
          <div className="flex items-center gap-2">
            <SeasonDropdown value={season} onChange={handleSeasonChange} />
            <TeamDropdown value={teamFilter} onChange={setTeamFilter} />
          </div>
        </div>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={16} className="text-alpbBlue" />
            <h2 className="text-lg font-semibold text-gray-800">{standingsTitle}</h2>
          </div>
          <Standings season={season} teamFilter={teamFilter} />
        </section>

        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-alpbBlue" />
            <h2 className="text-lg font-semibold text-gray-800">{leadersTitle}</h2>
          </div>
          <StatLeaders season={season} teamFilter={teamFilter} />
        </section>

        {teamFilter && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <History size={16} className="text-alpbBlue" />
              <h2 className="text-lg font-semibold text-gray-800">
                {teamFilter} · All Seasons
              </h2>
            </div>
            <TeamHistory teamName={teamFilter} />
          </section>
        )}

      </div>
    </div>
  );
}

const AroundLeaguePage = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SidebarTrigger className="absolute top-2 left-2 z-10" />
        <Suspense fallback={<div className="p-8 text-gray-400">Loading…</div>}>
          <AroundLeagueContent />
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AroundLeaguePage;
