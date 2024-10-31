import React from "react";
import Widget from "./widget";
import { useState, useEffect } from "react";


export default function Widgets() {
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("role");
    setIsDev(role === "developer" ? true : false);
    console.log("isDev: ", false);
  }, []);

  // Sample static widgets
  const widgets = [
    {
      developerName: "Widget Team 1",
      developerId: "123",
      widgetId: "12345",
      widgetName: "Heatmap",
      description:
        "This widget provides amazing insights for many baseball players.",
      isFavorite: true,
      imageUrl: "/alpb-logo.png",
    },
    {
      developerName: "Team2",
      developerId: "234",
      widgetId: "12546",
      widgetName: "Pitch Stats",
      description: "Lorem ipsum etcetera.",
      isFavorite: false,
    },
    {
      developerName: "Analysis Crew",
      developerId: "345",
      widgetId: "23456",
      widgetName: "Strike Zone Tracker",
      description: "Tracks strike zone metrics in real-time.",
      isFavorite: true,
    },
    {
      developerName: "Stat Lab",
      developerId: "456",
      widgetId: "34567",
      widgetName: "Swing Analyzer",
      description: "Analyzes the dynamics of each swing.",
      isFavorite: false,
    },
    {
      developerName: "Widget Innovators",
      developerId: "567",
      widgetId: "45678",
      widgetName: "Pitch Speed Heatmap",
      description: "Displays heatmaps based on pitch speed.",
      isFavorite: true,
    },
    {
      developerName: "Data Pros",
      developerId: "678",
      widgetId: "56789",
      widgetName: "Batting Average Calculator",
      description: "Calculates the average of recent batting performances.",
      isFavorite: false,
    },
    {
      developerName: "Game Insights",
      developerId: "789",
      widgetId: "67890",
      widgetName: "Home Run Probability",
      description: "Predicts the probability of a home run for each pitch.",
      isFavorite: true,
    },
    {
      developerName: "Metrics Team",
      developerId: "890",
      widgetId: "78901",
      widgetName: "Defensive Positioning",
      description: "Suggests optimal player positions based on game data.",
      isFavorite: false,
    },
    {
      developerName: "Performance Analytics",
      developerId: "901",
      widgetId: "89012",
      widgetName: "Game Replay",
      description: "Visualizes game replay data and highlights.",
      isFavorite: true,
    },
  ];

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
          if (isDev && widget.developerId === ) {
            // render
            return widget;
          } else if (widget.developerId === ) {
            return widget;
          }
        })
        .map(
        ({
          developerName,
          developerId,
          widgetId,
          widgetName,
          description,
          isFavorite,
          imageUrl,
        }) => {
          return (
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
          );
        },
      )}
    </div>
  );
}
