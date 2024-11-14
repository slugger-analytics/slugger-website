import React, { useEffect, useMemo, useState } from "react";
import Widget from "./widget";
import { fetchWidgets } from "../../../api/widget"; // Adjust path if needed
import { useAuth } from "@/app/contexts/AuthContext";
import { WidgetType } from "@/data/types";
import useQueryWidgets from "@/app/hooks/use-query-widgets";
import { $favWidgetIds, $filtersVersion, $filters, $widgetQuery, $widgetsVersion } from "@/lib/store";
import { useStore } from "@nanostores/react";

export default function Widgets() {
  const [loading, setLoading] = useState(true);
  const [isDev, setIsDev] = useState(false);
  const { widgets } = useQueryWidgets();
  const widgetsVersion = useStore($widgetsVersion);
  const { userId, userRole } = useAuth();
  const favWidgetIds = useStore($favWidgetIds);
  const filtersVersion = useStore($filtersVersion);
  const widgetQuery = useStore($widgetQuery);
  const filters = useStore($filters);

  const setUserRole = async () => {
    try {
      if (userRole === "Widget Developer") {
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
  }, [userId, userRole]);

  const filteredWidgets = useMemo(() => {
    return widgets
      .filter((widget) => {
        console.log("Filtering widgets...")
        if (!widget.name.toLowerCase().includes(widgetQuery.toLowerCase())) {
          // Widget must include search query
          return false;
        }
        if (filters.has("favorites") && !favWidgetIds.has(widget.id)) {
          // If "favorites" filter is enabled, widget must be a favorite.
          return false;
        }
        if (isDev) {
          if (userId && widget.developerIds?.includes(userId)) {
            return true;
          }
          return false;
        }

        return true;
      })
  }, [filtersVersion, widgetsVersion])

  if (loading) {
    // TODO this could look prettier
    return <p>Loading widgets...</p>;
  }

  return (
    <div className="grid gap-10 p-4 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
      {filteredWidgets
        .map((widget) => (
          <Widget
            key={widget.id}
            {...widget}
            isDev={isDev}
            visibility={widget.visibility ?? "Private"} // Pass visibility here as well
            isFavorite={favWidgetIds.has(widget.id)}
          />
        ))}
    </div>
  );
}
