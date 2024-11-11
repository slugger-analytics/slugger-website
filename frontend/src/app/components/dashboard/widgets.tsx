import React, { useEffect, useState } from "react";
import Widget from "./widget";
import { fetchWidgets } from "../../../api/widget"; // Adjust path if needed
import { useAuth } from "@/app/contexts/AuthContext";
import { setWidgetsStore } from "@/lib/store";
import { WidgetType } from "@/data/types";

export default function Widgets() {
  const [widgets, setWidgets] = useState<WidgetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDev, setIsDev] = useState(false);
  const { userId } = useAuth();

  const loadWidgets = async () => {
    try {
      const role = localStorage.getItem("role");
      setIsDev(role === "Widget Developer");
      const data = await fetchWidgets();

      const widgetData: WidgetType[] = data.map((item: any) => ({
        id: item.widget_id,
        name: item.widget_name || "Unnamed Widget",
        description: item.description || "",
        widgetId: item.widget_id || "",
        visibility: item.visibility || "public",  // Ensure visibility is included
        redirectUrl: item.redirect_link || "",
        imageUrl: item.image_url || undefined,
        developerIds: item.developer_ids || [],
      }));

      setWidgets(widgetData);
      setWidgetsStore(widgets);
    } catch (error) {
      console.error("Error fetching widgets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWidgets();
  }, [userId]);


  if (loading) {
    // TODO this could look prettier
    return <p>Loading widgets...</p>;
  }

  return (
    <div className="grid gap-10 p-4 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
      {widgets
        .filter((widget) =>
          isDev && userId && widget.developerIds?.includes(userId) ? widget : !isDev
        )
        .map((widget) => (
          <Widget
            key={widget.id}
            {...widget}
            isDev={isDev}
            onUpdateWidget={loadWidgets} // Pass the updatedWidget with visibility
            visibility={widget.visibility ?? "Private"} // Pass visibility here as well
          />
        ))}
    </div>
  );
}
