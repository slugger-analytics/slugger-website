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
} from "@/lib/widgetStore";
import { $user } from "@/lib/userStore";
import { useStore } from "@nanostores/react";

export default function Widgets() {
  const [loading, setLoading] = useState(true);
  const [isDev, setIsDev] = useState(false);

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

  /**
   * Sets the user role (whether the user is a "Widget Developer").
   * Based on the user's role, it adjusts the `isDev` state to control widget visibility.
   */
  const setUserRole = async () => {
    try {
      if (user.role === "widget developer") {
        setIsDev(true);
      } else {
        setIsDev(false);
      }
    } catch (error) {
      console.error("Error fetching widgets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUserRole();
  }, [user.id, user.role]);

  /**
   * Filters the widgets based on:
   * - Search query: widget name or description must match the query.
   * - Favorites filter: only favorite widgets will be shown if the "favorites" filter is active.
   * - Developer filter: if the user is a widget developer, only widgets created by the user will be shown.
   * @returns {WidgetType[]} - Filtered list of widgets based on the active filters.
   */
  const filteredWidgets = useMemo(() => {
    return widgets
      .filter((widget: WidgetType) => {
        const lowerName = widget.name.toLowerCase();
        const lowerDescription = widget.description?.toLowerCase();
        const lowerQuery = widgetQuery.toLowerCase();

        // Check if widget name or description matches the search query
        if (
          !(
            lowerName.includes(lowerQuery) ||
            lowerDescription?.includes(lowerQuery)
          )
        ) {
          return false;
        }

        // If "favorites" filter is enabled, only show widgets in the favorites list
        if (filters.has("favorites") && !favWidgetIds.has(widget.id)) {
          return false;
        }

        // If "categories" filter is enabled, only show widgets in the active category list
        if (
          activeCategoryIds.size > 0 &&
          !widget.categories.some((category) =>
            activeCategoryIds.has(category.id),
          )
        ) {
          return false;
        }

        // Show all widgets that match the search and filtering criteria
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
  ]);

  if (loading) {
    return <p>Loading widgets...</p>;
  }

  return (
    <div className="grid gap-10 p-4 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
      {filteredWidgets.map((widget: WidgetType) => (
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
  );
}
