"use client";
import React, { useState } from "react";
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
import { useAuth } from "../contexts/AuthContext";
import DashboardLoading from "../components/dashboard/dashboard-loading";
import DashboardContent from "../components/dashboard/dashboard-content";
import { $favWidgetIds, addRecentWidget } from "@/lib/widgetStore";
import { openWidgetTab } from "@/lib/tabStore";
import { $user } from "@/lib/userStore";
import StatLeaders from "../around-league/StatLeaders";
import Standings from "../around-league/Standings";
import RecentGameResults from "@/app/components/dashboard/recent-game-results";
import { AngleIcon } from "@radix-ui/react-icons";

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
    favWidgetIds?.has(widget.id)
  );

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SidebarTrigger />
          <div className="w-full h-full p-2">
            <div
              className="
                grid
                grid-cols-4
                grid-rows-4
                gap-4
                w-full
                h-full
              "
            >
              {/* ---------- HELLO (TOP LEFT) ---------- */}
              <div className="col-span-2 row-span-1 bg-white rounded-xl">
                <h1 className="text-3xl font-bold">Hello, {displayName}</h1>
              </div>

              {/* ---------- (TOP RIGHT) ---------- */}
              <div className="col-span-2 row-span-2 bg-white rounded-xl  p-2 flex flex-col">
                <h1 className="text-2xl font-bold text-center mb-1">{`${year} Current Leaders`}</h1>
                <div className="flex-1 overflow-y-auto flex justify-center">
                  <div className="w-fit text-center">
                    <Standings season={year} maxTeams={1} compact />
                  </div>
                </div>
              </div>

              {/* ---------- RECENT GAMES (BOTTOM LEFT) ---------- */}
              <div className="col-span-2 row-span-3 bg-white rounded-xl  p-4 flex flex-col">
                <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">
                  Recent Games
                </h2>
                <div className="flex-1 flex justify-center overflow-hidden">
                  <RecentGameResults />
                </div>
              </div>

              {/* ---------- FAVORITES (BOTTOM RIGHT) ---------- */}
              <div className="col-span-2 row-span-2 bg-white rounded-xl shadow p-4 flex flex-col">
                <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">
                  Favorite Widgets
                </h2>
                {widgetsLoading ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                    Loading favorites...
                  </div>
                ) : !favoriteWidgets.length ? (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
                    You don&apos;t have any favorites yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4 overflow-y-auto pb-2 flex-1 min-h-0">
                    {favoriteWidgets.map((widget) => (
                      <button
                        type="button"
                        key={widget.id}
                        onClick={() => handleFavoriteWidgetClick(widget)}
                        className="
                          relative
                          bg-gray-50 rounded-lg shadow
                          border border-gray-200
                          p-3 min-w-0 w-full
                          flex flex-col text-left
                          hover:bg-gray-100 cursor-pointer transition
                          group
                        "
                      >
                        <div className="w-full mb-2 flex-shrink-0">
                          <div className="w-full aspect-square rounded-lg bg-gray-200 overflow-hidden flex items-center justify-center">
                            {widget.imageUrl && widget.imageUrl !== "default" ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={widget.imageUrl}
                                alt={widget.name}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <AngleIcon className="size-10 fill-current text-gray-400" />
                            )}
                          </div>
                        </div>
                        <p className="font-semibold text-gray-900 text-xs line-clamp-2 text-center mt-1">
                          {widget.name}
                        </p>
                        {widget.description ? (
                          <span
                            className="
                              absolute inset-0 rounded-lg top-[1px]
                              bg-white/80 opacity-0 group-hover:opacity-100
                              transition-opacity duration-200
                              flex items-start justify-center p-3 pt-3
                              text-xs text-gray-700 text-center overflow-y-auto
                            "
                            aria-hidden
                          >
                            {widget.description}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
