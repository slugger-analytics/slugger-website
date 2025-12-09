"use client";
import React, { useState, useEffect } from "react";
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
//import RecentGames from "../components/dashboard/recent-game-results";
import { $favWidgetIds } from "@/lib/widgetStore";
import { $user } from "@/lib/userStore";
import StatLeaders from "../around-league/StatLeaders";
import Standings from "../around-league/Standings";


export default function HomePage() {
  const user = useStore($user);
  const favWidgetIds = useStore($favWidgetIds) as Set<number>;
  const [year, setYear] = useState("");
  const { widgets, widgetsLoading } = useQueryWidgets();

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
          {" "}
          {/* Ensures the route is protected and only accessible to authenticated users */}
          <SidebarTrigger />
          <div className="w-full h-full p-2 ">
            <div
              className="
          grid
          grid-cols-4
          grid-rows-2
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
<div className="col-span-2 row-span-1 bg-white rounded-xl shadow p-2 flex flex-col">
  <h1 className="text-2xl font-bold text-center mb-1">{`${year} Current Leaders`}</h1>

  <div className="flex-1 overflow-y-auto flex justify-center">
    <div className="w-fit text-center">
      <Standings setYear={setYear} maxTeams={1} compact />
    </div>
  </div>
</div>


              {/* ---------- MIDDLE GRID: PLACEHOLDERS FOR YOUR 5 ITEMS ---------- 
              <div className="col-span-1 row-span-1 bg-white rounded-xl shadow p-4">
                <h2 className="text-lg opacity-40">Item 1</h2>
              </div>

              <div className="col-span-1 row-span-1 bg-white rounded-xl shadow p-4">
                <h2 className="text-lg opacity-40">Item 2</h2>
              </div>

              <div className="col-span-1 row-span-1 bg-white rounded-xl shadow p-4">
                <h2 className="text-lg opacity-40">Item 3</h2>
              </div>

              <div className="col-span-1 row-span-1 bg-white rounded-xl shadow p-4">
                <h2 className="text-lg opacity-40">Item 4</h2>
              </div>*/}

              {/* ---------- ANOTHER ROW OF PLACEHOLDERS ---------- */}
              <div className="col-span-2 row-span-1 bg-white rounded-xl shadow p-4">
                <h2 className="text-2xl font-semibold mb-4">Recent League Games</h2>
              </div>

              <div className="col-span-2 row-span-1 bg-white rounded-xl shadow p-4">
                {/* ---------- FAVORITES (BOTTOM RIGHT) ---------- */}
                <h2 className="text-2xl font-semibold text-gray-900 mb-3">
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
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {favoriteWidgets.map((widget) => (
                      <div
                        key={widget.id}
                        className="
            bg-gray-50 rounded-lg shadow
            border border-gray-200
            p-4 aspect-square w-40
            flex flex-col justify-between
            hover:bg-gray-100 cursor-pointer transition
          "
                      >
                        {/* Widget Name */}
                        <p className="font-semibold text-gray-900 text-sm line-clamp-2">
                          {widget.name}
                        </p>
                        {/* Short Description if needed */}
                        {widget.description && (
                          <p className="text-xs text-gray-500 line-clamp-5 mt-1">
                            {widget.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ---------- RECENT WIDGETS (BOTTOM RIGHT) ---------- 
                            <div className="col-span-4 row-span-1 bg-white rounded-xl shadow p-4">
              </div>
              */}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
