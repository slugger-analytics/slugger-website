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

const SEASON_STORAGE_KEY = "selectedSeason";

function AroundLeagueContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Always start empty so server and first client render match (avoids hydration error).
  // Read URL / localStorage only after mount.
  const [season, setSeason] = useState<string>("");
  const [teamFilter, setTeamFilter] = useState<string>("");

  useEffect(() => {
    const fromUrl = searchParams.get("season");
    if (fromUrl) {
      setSeason(fromUrl);
      return;
    }
    const fromStorage = localStorage.getItem(SEASON_STORAGE_KEY);
    if (fromStorage) setSeason(fromStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSeasonChange = useCallback(
    (year: string) => {
      setSeason(year);
      if (typeof window !== "undefined") {
        localStorage.setItem(SEASON_STORAGE_KEY, year);
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("season", year);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="flex flex-col justify-center items-center w-full py-6">
      {/* Season + Team filters — top-left above all content */}
      <div className="w-[50%] max-w-[calc(100%-2rem)] min-w-[360px] flex items-center gap-3 mb-6">
        <SeasonDropdown value={season} onChange={handleSeasonChange} />
        <TeamDropdown value={teamFilter} onChange={setTeamFilter} />
      </div>

      <h1 className="text-3xl font-bold mb-5">
        {season ? `${season} ` : ""}Standings{teamFilter ? ` · ${teamFilter}` : ""}
      </h1>
      <Standings season={season} teamFilter={teamFilter} />

      <h1 className="text-3xl font-bold mb-5">
        {season ? `${season} ` : ""}Stat Leaders{teamFilter ? ` · ${teamFilter}` : ""}
      </h1>
      <StatLeaders season={season} teamFilter={teamFilter} />

      {teamFilter && (
        <>
          <h1 className="text-3xl font-bold mb-5">{teamFilter} · All Seasons</h1>
          <TeamHistory teamName={teamFilter} />
        </>
      )}
    </div>
  );
}

const AroundLeaguePage = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SidebarTrigger />
        {/* Suspense is required because useSearchParams reads URL at render time */}
        <Suspense fallback={<div className="p-8 text-gray-400">Loading…</div>}>
          <AroundLeagueContent />
        </Suspense>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AroundLeaguePage;
