"use client";

import React, { useEffect, useMemo, useState } from "react";
import Widget from "./widget";
import { WidgetType } from "@/data/types";
import useQueryWidgets from "@/app/hooks/use-query-widgets";
import {
  $favWidgetIds,
  $filtersVersion,
  $filters,
  $widgetQuery,
  $widgetsVersion,
  $activeCategoryIds,
  $sortBy,
  $sortDirection,
  $timeFrame,
  $recentWidgetIds, // from widgetStore.ts
} from "@/lib/widgetStore";
import { $user } from "@/lib/userStore";
import { useStore } from "@nanostores/react";

export default function Widgets() {
  const [loading, setLoading] = useState(true);
  const [isDev, setIsDev] = useState(false);
  const [hasLoadedRecents, setHasLoadedRecents] = useState(false); // 👈 NEW

  const { widgets } = useQueryWidgets();

  const widgetsVersion = useStore($widgetsVersion);
  const favWidgetIds = useStore($favWidgetIds);
  const filtersVersion = useStore($filtersVersion);
  const widgetQuery = useStore($widgetQuery);
  const filters = useStore($filters);
  const activeCategoryIds = useStore($activeCategoryIds);
  const user = useStore($user);
  const sortBy = useStore($sortBy);
  const sortDirection = useStore($sortDirection);
  const timeFrame = useStore($timeFrame);
  const recentWidgetIds = useStore($recentWidgetIds);

  // --- role / isDev setup ---
  const setUserRole = async () => {
    try {
      if (user.role === "widget developer") {
        setIsDev(true);
      } else {
        setIsDev(false);
      }
    } catch (error) {
      console.error("Error setting user role:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUserRole();
  }, [user.id, user.role]);

  // --- Load recent widgets for this user from localStorage ---
  useEffect(() => {
    if (!user?.id) return;
    if (typeof window === "undefined") return;

    try {
      const key = `recentWidgets_${user.id}`;
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          $recentWidgetIds.set(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to load recent widgets from localStorage", e);
    } finally {
      // mark that we've attempted the load (even if nothing was there)
      setHasLoadedRecents(true);
    }
  }, [user?.id]);

  // --- Persist recent widgets to localStorage whenever they change ---
  useEffect(() => {
    if (!user?.id) return;
    if (typeof window === "undefined") return;
    if (!hasLoadedRecents) return; // 👈 DO NOT SAVE UNTIL INITIAL LOAD IS DONE

    try {
      const key = `recentWidgets_${user.id}`;
      window.localStorage.setItem(key, JSON.stringify(recentWidgetIds));
    } catch (e) {
      console.error("Failed to save recent widgets to localStorage", e);
    }
  }, [recentWidgetIds, user?.id, hasLoadedRecents]);

  // --- Full filtered & sorted widget list ---
  const filteredWidgets = useMemo(() => {
    return widgets
      .filter((widget: WidgetType) => {
        const lowerName = widget.name.toLowerCase();
        const lowerDescription = widget.description?.toLowerCase();
        const lowerQuery = widgetQuery.toLowerCase();

        // Search
        if (
          !(
            lowerName.includes(lowerQuery) ||
            lowerDescription?.includes(lowerQuery)
          )
        ) {
          return false;
        }

        // Favorites filter
        if (filters.has("favorites") && !favWidgetIds.has(widget.id)) {
          return false;
        }

        // Categories filter
        if (
          activeCategoryIds.size > 0 &&
          !widget.categories.some((category) =>
            activeCategoryIds.has(category.id),
          )
        ) {
          return false;
        }

        return true;
      })
      .sort((a: WidgetType, b: WidgetType) => {
        let res = 0;
        if (sortBy === "launch_count") {
          if (timeFrame === "weekly") {
            res = b.metrics.weeklyLaunches - a.metrics.weeklyLaunches;
          } else if (timeFrame === "monthly") {
            res = b.metrics.monthlyLaunches - a.metrics.monthlyLaunches;
          } else if (timeFrame === "yearly") {
            res = b.metrics.yearlyLaunches - a.metrics.yearlyLaunches;
          } else {
            res = b.metrics.allTimeLaunches - a.metrics.allTimeLaunches;
          }
        } else {
          if (timeFrame === "weekly") {
            res =
              b.metrics.weeklyUniqueLaunches - a.metrics.weeklyUniqueLaunches;
          } else if (timeFrame === "monthly") {
            res =
              b.metrics.monthlyUniqueLaunches - a.metrics.monthlyUniqueLaunches;
          } else if (timeFrame === "yearly") {
            res =
              b.metrics.yearlyUniqueLaunches - a.metrics.yearlyUniqueLaunches;
          } else {
            res =
              b.metrics.allTimeUniqueLaunches - a.metrics.allTimeUniqueLaunches;
          }
        }
        return sortDirection === "asc" ? res : -res;
      });
  }, [
    filtersVersion,
    widgetsVersion,
    widgets,
    favWidgetIds,
    widgetQuery,
    isDev,
    user,
    filters,
    sortBy,
    sortDirection,
    timeFrame,
    activeCategoryIds,
  ]);

  if (loading) {
    return <p>Loading widgets...</p>;
  }

  if (!filteredWidgets.length) {
    return (
      <p className="px-4 text-sm text-muted-foreground">No widgets found.</p>
    );
  }

  // --- Build Recent from "4 most recently clicked" that also match filters ---
  const recentFromStore = recentWidgetIds
    .map((id) => filteredWidgets.find((w) => w.id === id))
    .filter((w): w is WidgetType => Boolean(w));

  const recentWidgets = recentFromStore.slice(0, 4);
  const recentIdsSet = new Set(recentWidgets.map((w) => w.id));

  // All = everything else
  const allWidgets = filteredWidgets.filter((w) => !recentIdsSet.has(w.id));

  return (
    <div className="flex flex-col w-full gap-10">
      {/* Recent section */}
      {recentWidgets.length > 0 && (
        <section>
          <h2 className="px-4 mb-4 text-lg font-semibold">Recent</h2>
          <div className="grid gap-10 p-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {recentWidgets.map((widget: WidgetType) => (
              <Widget
                key={widget.id}
                {...widget}
                isDev={isDev}
                visibility={widget.visibility ?? "Private"}
                isFavorite={favWidgetIds.has(widget.id)}
                categories={widget.categories}
              />
            ))}
          </div>
        </section>
      )}

      {/* All section – 4 across at xl */}
      <section>
        <h2 className="px-4 mb-4 text-lg font-semibold">All</h2>
        <div className="grid gap-10 p-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {allWidgets.map((widget: WidgetType) => (
            <Widget
              key={widget.id}
              {...widget}
              isDev={isDev}
              visibility={widget.visibility ?? "Private"}
              isFavorite={favWidgetIds.has(widget.id)}
              categories={widget.categories}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
