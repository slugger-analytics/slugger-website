"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useStore } from "@nanostores/react";
import { ParameterSelector } from "../components/ParameterSelector";
import { ParameterAnalysisResult } from "../components/ParameterAnalysisResult";
import { WidgetSelector } from "../components/WidgetSelector";
import { fetchWidgetOutputs, fetchWidgets, WidgetExecutionResult } from "@/api/widget";
import { WidgetType } from "@/data/types";
import { $user } from "@/lib/userStore";
import { ParameterizedAnalysisResponse } from "../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";

interface Team {
  id: string | number;
  name: string;
}

interface Player {
  id: string | number;
  name: string;
  teamId: string | number;
  position: string;
}

export default function SuperWidgetParameterizedPage() {
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [availableWidgets, setAvailableWidgets] = useState<WidgetType[]>([]);
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<number[]>([]);
  const [loadingWidgets, setLoadingWidgets] = useState(false);
  const [analysis, setAnalysis] = useState<ParameterizedAnalysisResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [widgetOutputs, setWidgetOutputs] = useState<WidgetExecutionResult[]>([]);
  const [widgetOutputsLoading, setWidgetOutputsLoading] = useState(false);
  const [widgetOutputsError, setWidgetOutputsError] = useState<string | null>(null);
  const user = useStore($user);
  const analysisAbortController = useRef<AbortController | null>(null);
  const widgetOutputRequestId = useRef(0);

  const DEFAULT_API_BASE = "http://localhost:3001";
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_BASE;

  const buildApiUrl = useCallback((path: string) => {
    if (!API_BASE_URL) return path;
    try {
      return new URL(path, API_BASE_URL).toString();
    } catch (error) {
      console.error("Invalid API URL", error);
      return path;
    }
  }, [API_BASE_URL]);

  const loadWidgets = useCallback(async () => {
    try {
      setLoadingWidgets(true);
      const userId = user?.id;
      const widgets = await fetchWidgets(userId);
      setAvailableWidgets(widgets);
    } catch (error) {
      console.error("Error loading widgets for parameterized analysis:", error);
      setAvailableWidgets([]);
    } finally {
      setLoadingWidgets(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadWidgets();
  }, [loadWidgets]);

  useEffect(() => {
    setSelectedWidgetIds(prev => prev.filter(id => availableWidgets.some(widget => widget.id === id)));
  }, [availableWidgets]);

  const handleWidgetToggle = useCallback((widgetId: number, checked: boolean) => {
    setSelectedWidgetIds(prev => {
      if (checked) {
        return prev.includes(widgetId) ? prev : [...prev, widgetId];
      }
      return prev.filter(id => id !== widgetId);
    });
  }, []);

  const selectedWidgets = useMemo(
    () => availableWidgets.filter(widget => selectedWidgetIds.includes(widget.id)),
    [availableWidgets, selectedWidgetIds]
  );

  useEffect(() => {
    return () => {
      analysisAbortController.current?.abort();
    };
  }, []);

  useEffect(() => {
    const teamIds = selectedTeams
      .map(team => team.id)
      .filter(id => id !== undefined && id !== null);
    const playerIds = selectedPlayers
      .map(player => player.id)
      .filter(id => id !== undefined && id !== null);

    if (teamIds.length === 0 && playerIds.length === 0) {
      setAnalysis(null);
      setAnalysisError(null);
      setAnalysisLoading(false);
      if (analysisAbortController.current) {
        analysisAbortController.current.abort();
        analysisAbortController.current = null;
      }
      return;
    }

    const controller = new AbortController();
    analysisAbortController.current?.abort();
    analysisAbortController.current = controller;

    const runAnalysis = async () => {
      try {
        setAnalysisLoading(true);
        setAnalysisError(null);

        const response = await fetch(buildApiUrl("/api/super-widget/parameterized-analysis"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            teamIds,
            playerIds,
            analysisType: "group"
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `Request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (!data?.success) {
          throw new Error(data?.error ?? "Unable to generate analysis");
        }

        const typedData = data as ParameterizedAnalysisResponse;

        const teamNameMap = new Map<string, string>();
        selectedTeams.forEach(team => {
          if (team.id !== undefined && team.name) {
            teamNameMap.set(String(team.id), team.name);
          }
        });
        (typedData.data?.teamAnalysis ?? []).forEach(team => {
          if (team.teamId !== undefined && team.teamName) {
            teamNameMap.set(String(team.teamId), team.teamName);
          }
        });

        const normalizedPlayerAnalysis = (typedData.data?.playerAnalysis ?? []).map(player => {
          const teamIdentifier = player.team ?? "";
          const resolvedName = teamNameMap.get(String(teamIdentifier));
          if (!resolvedName) return player;
          return {
            ...player,
            team: resolvedName
          };
        });

        setAnalysis({
          ...typedData,
          data: {
            ...typedData.data,
            playerAnalysis: normalizedPlayerAnalysis
          }
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        console.error("Error fetching parameterized analysis:", err);
        setAnalysisError((err as Error)?.message ?? "Unexpected error generating analysis");
        setAnalysis(null);
      } finally {
        setAnalysisLoading(false);
      }
    };

    runAnalysis();

    return () => {
      controller.abort();
    };
  }, [selectedTeams, selectedPlayers, buildApiUrl]);

  useEffect(() => {
    const teamIds = selectedTeams
      .map(team => team.id)
      .filter(id => id !== undefined && id !== null);
    const playerIds = selectedPlayers
      .map(player => player.id)
      .filter(id => id !== undefined && id !== null);

    if (selectedWidgetIds.length === 0 || (teamIds.length === 0 && playerIds.length === 0)) {
      setWidgetOutputs([]);
      setWidgetOutputsError(null);
      setWidgetOutputsLoading(false);
      return;
    }

    const requestId = ++widgetOutputRequestId.current;

    const runWidgetOutputFetch = async () => {
      try {
        setWidgetOutputsLoading(true);
        setWidgetOutputsError(null);

        const outputs = await fetchWidgetOutputs(selectedWidgetIds, {
          teamIds,
          playerIds,
          source: "superwidget-parameterized-script"
        });

        if (requestId !== widgetOutputRequestId.current) {
          return;
        }

        setWidgetOutputs(outputs);
      } catch (error) {
        if (requestId !== widgetOutputRequestId.current) {
          return;
        }
        console.error("Error fetching widget outputs:", error);
        setWidgetOutputs([]);
        setWidgetOutputsError((error as Error)?.message ?? "Failed to fetch widget outputs");
      } finally {
        if (requestId === widgetOutputRequestId.current) {
          setWidgetOutputsLoading(false);
        }
      }
    };

    runWidgetOutputFetch();
  }, [selectedTeams, selectedPlayers, selectedWidgetIds]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🧠 SuperWidget Parameterized Analysis Tool
          </h1>
          <p className="text-lg text-gray-600">
            Select specific teams and players for targeted analysis, and gain personalized baseball data insights
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Parameter Selector */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-6">
              <ParameterSelector
                selectedTeams={selectedTeams}
                selectedPlayers={selectedPlayers}
                onTeamsChange={setSelectedTeams}
                onPlayersChange={setSelectedPlayers}
              />
              <WidgetSelector
                widgets={availableWidgets}
                selectedWidgetIds={selectedWidgetIds}
                onToggle={handleWidgetToggle}
                loading={loadingWidgets}
              />
            </div>
          </div>

          {/* Right Column - Analysis Result */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              <ParameterAnalysisResult
                selectedTeams={selectedTeams}
                selectedPlayers={selectedPlayers}
                selectedWidgets={selectedWidgets}
                analysis={analysis}
                loading={analysisLoading}
                error={analysisError}
              />

              <Card className="border-indigo-200">
                <CardHeader>
                  <CardTitle>Widget Script Outputs</CardTitle>
                  <CardDescription>
                    Direct output fetched from selected widgets using current team/player parameters
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {widgetOutputsLoading ? (
                    <p className="text-sm text-gray-600">Fetching widget outputs...</p>
                  ) : widgetOutputsError ? (
                    <p className="text-sm text-red-600">{widgetOutputsError}</p>
                  ) : widgetOutputs.length > 0 ? (
                    <div className="space-y-4">
                      {widgetOutputs.map((output) => (
                        <div key={output.widgetId} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{output.widgetName}</h4>
                            <Badge variant={output.success ? "default" : "destructive"}>
                              {output.success ? "Success" : "Failed"}
                            </Badge>
                          </div>

                          {output.bullets.length > 0 && (
                            <ul className="mb-3 space-y-1">
                              {output.bullets.map((bullet, index) => (
                                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                                  <span className="text-indigo-600 mt-1">•</span>
                                  <span>{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          <div className="bg-gray-50 rounded-md p-2">
                            <p className="text-xs text-gray-500 mb-2">Raw Output</p>
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words max-h-48 overflow-auto">
                              {typeof output.widgetOutput === "string"
                                ? output.widgetOutput
                                : JSON.stringify(output.widgetOutput ?? {}, null, 2)}
                            </pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Select teams/players and widgets to fetch script-style outputs.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-12 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">💡 Usage Guide</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>✓ Select teams of interest in the left panel (multi-select supported)</li>
            <li>✓ After selecting teams, you can choose specific players from that team&apos;s roster</li>
            <li>✓ The right panel displays analysis results in real-time based on your selections</li>
            <li>✓ Analysis includes team comparisons, player statistics, performance metrics and more</li>
            <li>✓ Ideal for teaching, research, and tactical analysis</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
