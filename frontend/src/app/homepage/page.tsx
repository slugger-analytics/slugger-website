"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/app/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/app/components/ui/sidebar";
import ProtectedRoute from "../components/ProtectedRoutes";
import useQueryWidgets from "../hooks/use-query-widgets";
import { useStore } from "@nanostores/react";
import { $favWidgetIds, addRecentWidget } from "@/lib/widgetStore";
import { openWidgetTab } from "@/lib/tabStore";
import { $user } from "@/lib/userStore";
import Standings from "../around-league/Standings";
import RecentGameResults from "@/app/components/dashboard/recent-game-results";
import { AngleIcon } from "@radix-ui/react-icons";
import { BarChart2, Trophy, Star, CalendarDays, ArrowRight, AlertTriangle } from "lucide-react";

const TODAY = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

export default function HomePage() {
  const router = useRouter();
  const user = useStore($user);
  const favWidgetIds = useStore($favWidgetIds) as Set<number>;
  const [year] = useState("");
  const { widgets, widgetsLoading } = useQueryWidgets();

  const handleFavoriteWidgetClick = (widget: (typeof widgets)[number]) => {
    addRecentWidget(widget.id);
    if (widget.redirectLink) {
      openWidgetTab(widget);
      router.push("/dashboard");
    }
  };

  const displayName =
    (user.first || user.last
      ? `${user.first} ${user.last}`.trim()
      : user.email) || "there";

  const favoriteWidgets = widgets.filter((widget) =>
    favWidgetIds?.has(widget.id),
  );

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="w-full min-h-full bg-gray-50 p-4 pb-20">
            <div className="max-w-7xl mx-auto flex flex-col gap-4 mb-16">

              {/* ── WELCOME BANNER ── */}
              <div className="relative rounded-2xl bg-alpbBlue px-3 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow">
                <div className="absolute top-2 left-2 z-10">
                  <SidebarTrigger className="text-white hover:bg-white/20 hover:text-white" />
                </div>
                <div className="pt-7 sm:pt-1 pl-10">
                  <p className="text-blue-200 font-bold text-8px">
                    Atlantic League of Professional Baseball
                  </p>
            
                  <p className="text-2xl font-bold text-white leading-none my-6">
                    Welcome back, {displayName}
                  </p>
                  <p className="text-blue-200 text-sm mb-3">
                    {TODAY}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Link
                    href="/around-league"
                    className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <BarChart2 size={15} />
                    Around the League
                    <ArrowRight size={13} />
                  </Link>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <Star size={15} />
                    My Widgets
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>

              {/*temporary banner development update saying we are working on updated league data*/}
              <div className="rounded-2xl bg-yellow-50 px-4 py-3 flex items-center gap-3 border border-yellow-200">
                <div>
                  <p className="text-sm text-yellow-700 font-medium">
                    <span className="font-bold">Note:</span> &quot;Recent Games&quot; and &quot;Around the League&quot; sections may be temporarily outdated
                  </p>
                  <details className="text-xs text-yellow-700 mt-1">
                    <summary className="cursor-pointer">More info</summary>
                    <p className="text-xs text-yellow-700">
                      Due to the termination of previous data sources, we are currently migrating to a new provider for league-wide standings and scores. This only affects the &quot;Recent Games&quot; and &quot;Around the League&quot; sections — analytical play-by-play data used in widgets will remain up-to-date. Thank you for your patience, and full league insights will be back very soon! If you have any questions, feel free to use the &quot;Report a Bug&quot; page to reach us directly.
                    </p>
                  </details>
                </div>
              </div>

              {/* ── MAIN GRID ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:h-[680px]">

                {/* ── RECENT GAMES ── */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 pb-8 flex flex-col overflow-hidden lg:h-full">
                  <div className="flex items-center gap-2 mb-4 shrink-0">
                    <CalendarDays size={18} className="text-alpbBlue" />
                    <h2 className="text-base font-semibold text-gray-800">Recent Games</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <RecentGameResults />
                  </div>
                </div>

                {/* ── RIGHT COLUMN ── */}
                <div className="flex flex-col gap-4 lg:h-full min-h-0">

                  {/* ── CURRENT STANDINGS LEADERS ── */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Trophy size={18} className="text-alpbBlue" />
                        <h2 className="text-base font-semibold text-gray-800">
                          Current Standings
                        </h2>
                      </div>
                      <Link
                        href="/around-league"
                        className="text-xs text-alpbBlue hover:underline flex items-center gap-0.5"
                      >
                        Full standings <ArrowRight size={11} />
                      </Link>
                    </div>
                    <div className="overflow-x-auto">
                      <Standings season={year} maxTeams={1} compact />
                    </div>
                  </div>

                  {/* ── FAVORITE WIDGETS ── */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col flex-1 min-h-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Star size={18} className="text-alpbBlue" />
                        <h2 className="text-base font-semibold text-gray-800">
                          Favorite Widgets
                        </h2>
                      </div>
                      <Link
                        href="/dashboard"
                        className="text-xs text-alpbBlue hover:underline flex items-center gap-0.5"
                      >
                        All widgets <ArrowRight size={11} />
                      </Link>
                    </div>

                    {widgetsLoading ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-alpbBlue animate-spin" />
                          <span className="text-sm">Loading…</span>
                        </div>
                      </div>
                    ) : !favoriteWidgets.length ? (
                      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-6 border border-dashed border-gray-200 rounded-xl">
                        <Star size={28} className="text-gray-300" />
                        <p className="text-gray-400 text-sm text-center">
                          No favorites yet.
                        </p>
                        <Link
                          href="/dashboard"
                          className="text-xs text-alpbBlue hover:underline"
                        >
                          Browse widgets →
                        </Link>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 overflow-y-auto flex-1 min-h-0">
                        {favoriteWidgets.map((widget) => (
                          <button
                            type="button"
                            key={widget.id}
                            onClick={() => handleFavoriteWidgetClick(widget)}
                            className="relative group bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 flex flex-col items-center transition-colors cursor-pointer"
                          >
                            <div className="w-full aspect-square rounded-md bg-gray-200 overflow-hidden flex items-center justify-center mb-1">
                              {widget.imageUrl && widget.imageUrl !== "default" ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={widget.imageUrl}
                                  alt={widget.name}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <AngleIcon className="size-5 fill-current text-gray-400" />
                              )}
                            </div>
                            <p className="font-medium text-gray-700 text-xs line-clamp-2 text-center leading-tight">
                              {widget.name}
                            </p>
                            {widget.description && (
                              <span
                                className="absolute inset-0 rounded-lg bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-start justify-center p-1.5 text-[14px] text-gray-600 text-center leading-tight overflow-y-auto"
                                aria-hidden
                              >
                                {widget.description}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
