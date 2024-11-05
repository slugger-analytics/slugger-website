"use client"
import React, { useEffect, useState } from "react";
import Widget from "./widget";
import { fetchWidgets } from "../../../api/widget"; // Adjust path if needed
import { jwtDecode } from "jwt-decode";

interface WidgetData {
  developerIds: string[];
  widgetId: string;
  widgetName: string;
  description: string;
  isFavorite: boolean;
  imageUrl?: string;
  redirectUrl: string;
}

export default function Widgets() {
    const [widgets, setWidgets] = useState<WidgetData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDev, setIsDev] = useState(false);
    let token: string;
  
    useEffect(() => {
      // Fetch widgets from backend
      const loadWidgets = async () => {
        try {
          const res = localStorage.getItem("idToken");
          if (!res) {
            throw new Error("idToken does not exist");
          } else {
            token = res;
          }
          const role = localStorage.getItem("role");
          setIsDev(role === "Widget Developer" ? true : false);
          const data = await fetchWidgets();
          console.log("data:", data)
          const decodedToken: any = jwtDecode(token);
          // Map backend data to WidgetData format if needed
          const widgetData: WidgetData[] = data.map((item: any) => ({
            developerIds: item.developer_ids || [], // could process each developerIds array into a set if we run into frontend performance issues
            widgetId: item.widget_id || "", 
            widgetName: item.widget_name || "Unnamed Widget",
            description: item.description || "",
            isFavorite: item.is_favorite || false,
            imageUrl: item.image_url || undefined,
            redirectUrl: item.redirect_link || undefined,
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
          .filter((widget) => {
            if (isDev && widget.developerId === token) {
              // render
              return widget;
            } else if (widget.developerId === token) {
              return widget;
            }
        })
        .map(
        ({
          developerIds,
          widgetId,
          widgetName,
          description,
          isFavorite,
          imageUrl,
          redirectUrl
        }) => {
          return (
            <Widget
              key={widgetId}
              developerIds={developerIds}
              widgetId={widgetId}
              widgetName={widgetName}
              description={description}
              isFavorite={isFavorite}
              redirectUrl={redirectUrl}
              {...(imageUrl && { imageUrl })}
              isDev={isDev}
            />
        )},
      )}
      </div>
    );
  }
