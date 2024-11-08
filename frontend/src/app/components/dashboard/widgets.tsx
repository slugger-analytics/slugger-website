import React, { useEffect, useState } from "react";
import Widget from "./widget";
import { fetchWidgets } from "../../../api/widget"; // Adjust path if needed
import { useAuth } from "@/app/contexts/AuthContext";

interface WidgetData {
  developerIds: string[];
  widgetId: string;
  widgetName: string;
  description: string;
  isFavorite: boolean;
  imageUrl?: string;
  redirectUrl: string;
  visibility: string;  // Add visibility to WidgetData
}

export default function Widgets() {
  const [widgets, setWidgets] = useState<WidgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDev, setIsDev] = useState(false);
  const { userId } = useAuth();

  useEffect(() => {
    const loadWidgets = async () => {
      try {
        const role = localStorage.getItem("role");
        setIsDev(role === "Widget Developer");
        const data = await fetchWidgets();

        const widgetData: WidgetData[] = data.map((item: any) => ({
          developerIds: item.developer_ids || [],
          widgetId: item.widget_id || "",
          widgetName: item.widget_name || "Unnamed Widget",
          description: item.description || "",
          isFavorite: item.is_favorite || false,
          imageUrl: item.image_url || undefined,
          redirectUrl: item.redirect_link || "",
          visibility: item.visibility || "public",  // Ensure visibility is included
        }));

        setWidgets(widgetData);
      } catch (error) {
        console.error("Error fetching widgets:", error);
      } finally {
        setLoading(false);
      }
    };

    loadWidgets();
  }, [userId]);

  const updateWidget = (updatedWidget: WidgetData) => {
    setWidgets((prevWidgets) =>
      prevWidgets.map((widget) =>
        widget.widgetId === updatedWidget.widgetId ? { ...widget, ...updatedWidget } : widget
      )
    );
  };

  if (loading) {
    return <p>Loading widgets...</p>;
  }

  return (
    <div className="grid gap-10 p-4 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
      {widgets
        .filter((widget) =>
          isDev && userId && widget.developerIds.includes(userId) ? widget : !isDev
        )
        .map((widget) => (
          <Widget
            key={widget.widgetId}
            {...widget}
            isDev={isDev}
            onUpdateWidget={updateWidget} // Pass the updatedWidget with visibility
            visibility={widget.visibility} // Pass visibility here as well
          />
        ))}
    </div>
  );
}
