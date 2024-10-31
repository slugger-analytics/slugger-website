"use client"
import React, { useEffect, useState } from "react";
import Widget from "./widget";
import { fetchWidgets } from "../../../api/widget"; // Adjust path if needed

interface WidgetData {
  developerName: string;
  developerId: string;
  widgetId: string;
  widgetName: string;
  description: string;
  isFavorite: boolean;
  imageUrl?: string;
}

export default function Widgets() {
    const [widgets, setWidgets] = useState<WidgetData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDev, setIsDev] = useState(false);
  
    useEffect(() => {
      // Fetch widgets from backend
      const loadWidgets = async () => {
        try {
          const role = localStorage.getItem("role");
          setIsDev(role === "developer" ? true : false);
          console.log("isDev: ", false);
          const data = await fetchWidgets();
          
          // Map backend data to WidgetData format if needed
          const widgetData: WidgetData[] = data.map((item: any) => ({
            developerName: item.developer_name || "Unknown",
            developerId: item.developer_id || "",
            widgetId: item.widget_id || "",
            widgetName: item.widget_name || "Unnamed Widget",
            description: item.description || "",
            isFavorite: item.is_favorite || false,
            imageUrl: item.image_url || undefined,
          }));
    
          setWidgets(widgetData);
        } catch (error) {
          console.error("Error fetching widgets:", error);
        } finally {
          setLoading(false);
        }
      };
    
      loadWidgets();
    }, []);
  
    if (loading) {
      return <p>Loading widgets...</p>;
    }

  return (
    <div
      className="grid gap-10 p-4
    sm:grid-cols-1
    md:grid-cols-1
    lg:grid-cols-2
    xl:grid-cols-3
    3xl:grid-cols-4
    "
    >
      {widgets
          // .filter((widget) => {
        //   if (isDev && widget.developerId === ) {
        //     // render
        //     return widget;
        //   } else if (widget.developerId === ) {
        //     return widget;
        //   }
        // })
        .map(
        ({
          developerName,
          developerId,
          widgetId,
          widgetName,
          description,
          isFavorite,
          imageUrl,
        }) => (
            <Widget
              key={widgetId}
              developerName={developerName}
              developerId={developerId}
              widgetId={widgetId}
              widgetName={widgetName}
              description={description}
              isFavorite={isFavorite}
              {...(imageUrl && { imageUrl })}
            />
        ),
      )}
      </div>
    );
  }
