"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useStore } from "@nanostores/react";
import { ParameterSelector } from "../components/ParameterSelector";
import { ParameterAnalysisResult } from "../components/ParameterAnalysisResult";
import { WidgetSelector } from "../components/WidgetSelector";
import { exportWidgetPdf, fetchWidgetOutputs, fetchWidgetSelectorOptions, fetchWidgets, WidgetExecutionResult } from "@/api/widget";
import { WidgetType } from "@/data/types";
import { $user } from "@/lib/userStore";
import { ParameterizedAnalysisResponse } from "../types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";

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

interface WidgetPdfState {
  loading: boolean;
  error?: string;
  pdfUrl?: string;
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
  const [widgetPdfStates, setWidgetPdfStates] = useState<Record<number, WidgetPdfState>>({});
  const [selectorTeams, setSelectorTeams] = useState<Team[] | null>(null);
  const [selectorPlayers, setSelectorPlayers] = useState<Player[] | null>(null);
  const [selectorOptionsLoading, setSelectorOptionsLoading] = useState(false);
  const [selectorOptionsError, setSelectorOptionsError] = useState<string | null>(null);
  const [selectorSourceWidgetName, setSelectorSourceWidgetName] = useState<string | null>(null);
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

  const selectorSourceWidgetId = useMemo(() => {
    if (selectedWidgetIds.includes(93)) {
      return 93;
    }
    return selectedWidgetIds.length === 1 ? selectedWidgetIds[0] : null;
  }, [selectedWidgetIds]);

  const selectorSourceWidget = useMemo(
    () => (selectorSourceWidgetId ? availableWidgets.find((widget) => widget.id === selectorSourceWidgetId) : null),
    [availableWidgets, selectorSourceWidgetId]
  );

  useEffect(() => {
    if (!selectorSourceWidgetId) {
      setSelectorTeams(null);
      setSelectorPlayers(null);
      setSelectorOptionsError(null);
      setSelectorOptionsLoading(false);
      setSelectorSourceWidgetName(null);
      return;
    }

    const loadSelectorOptions = async () => {
      try {
        setSelectorOptionsLoading(true);
        setSelectorOptionsError(null);
        const data = await fetchWidgetSelectorOptions(selectorSourceWidgetId);
        const teams = (data.teams || []) as Team[];
        const players = (data.players || []) as Player[];
        const widgetName = data.widgetName || selectorSourceWidget?.name || "widget";

        setSelectorSourceWidgetName(widgetName);

        if (teams.length > 0 && players.length > 0) {
          setSelectorTeams(teams);
          setSelectorPlayers(players);
        } else {
          setSelectorTeams(null);
          setSelectorPlayers(null);
          setSelectorOptionsError(`${widgetName} has no mappable team/player options; using default selector source.`);
        }
      } catch (error) {
        console.error("Error loading widget selector options:", error);
        setSelectorTeams(null);
        setSelectorPlayers(null);
        setSelectorSourceWidgetName(selectorSourceWidget?.name || null);
        setSelectorOptionsError((error as Error)?.message ?? "Failed to load selector options");
      } finally {
        setSelectorOptionsLoading(false);
      }
    };

    loadSelectorOptions();
  }, [selectorSourceWidgetId, selectorSourceWidget?.name]);

  useEffect(() => {
    if (!selectorSourceWidgetId || !selectorTeams || !selectorPlayers) return;

    const validTeamIds = new Set(selectorTeams.map((team) => String(team.id)));
    const validPlayerIds = new Set(selectorPlayers.map((player) => String(player.id)));

    setSelectedTeams((prev) => prev.filter((team) => validTeamIds.has(String(team.id))));
    setSelectedPlayers((prev) => prev.filter((player) => validPlayerIds.has(String(player.id))));
  }, [selectorSourceWidgetId, selectorTeams, selectorPlayers]);

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

  const handleExportWidgetPdf = useCallback(async (widgetId: number) => {
    const teamIds = selectedTeams
      .map(team => team.id)
      .filter(id => id !== undefined && id !== null);
    const teamNames = selectedTeams
      .map(team => team.name)
      .filter(name => typeof name === "string" && name.trim().length > 0);
    const playerIds = selectedPlayers
      .map(player => player.id)
      .filter(id => id !== undefined && id !== null);
    const playerNames = selectedPlayers
      .map(player => player.name)
      .filter(name => typeof name === "string" && name.trim().length > 0);

    setWidgetPdfStates(prev => ({
      ...prev,
      [widgetId]: {
        loading: true,
        error: undefined,
        pdfUrl: prev[widgetId]?.pdfUrl,
      }
    }));

    try {
      const result = await exportWidgetPdf(widgetId, {
        teamIds,
        playerIds,
        teamNames,
        playerNames,
        source: "superwidget-parameterized-full-pdf"
      });

      setWidgetPdfStates(prev => ({
        ...prev,
        [widgetId]: {
          loading: false,
          error: result.success ? undefined : result.message,
          pdfUrl: result.pdfUrl,
        }
      }));
    } catch (error) {
      setWidgetPdfStates(prev => ({
        ...prev,
        [widgetId]: {
          loading: false,
          error: (error as Error)?.message ?? "Failed to export PDF",
          pdfUrl: prev[widgetId]?.pdfUrl,
        }
      }));
    }
  }, [selectedTeams, selectedPlayers]);

  const handleOpenWidgetInBrowser = useCallback((widgetId: number, directLink?: string) => {
    const widget = selectedWidgets.find(item => item.id === widgetId);
    const redirectLink = directLink || widget?.redirectLink;

    if (!redirectLink) {
      setWidgetPdfStates(prev => ({
        ...prev,
        [widgetId]: {
          loading: false,
          error: "Widget redirect URL is missing",
          pdfUrl: prev[widgetId]?.pdfUrl,
        },
      }));
      return;
    }

    const teamIds = selectedTeams
      .map(team => team.id)
      .filter(id => id !== undefined && id !== null)
      .map(id => String(id));
    const teamNames = selectedTeams
      .map(team => team.name)
      .filter(name => typeof name === "string" && name.trim().length > 0);
    const playerIds = selectedPlayers
      .map(player => player.id)
      .filter(id => id !== undefined && id !== null)
      .map(id => String(id));
    const playerNames = selectedPlayers
      .map(player => player.name)
      .filter(name => typeof name === "string" && name.trim().length > 0);

    const parsedRedirect = new URL(redirectLink);
    const baseUrl = `${parsedRedirect.origin}${parsedRedirect.pathname}`;
    const url = new URL(baseUrl);

    if (teamIds.length > 0) {
      url.searchParams.set("teamIds", JSON.stringify(teamIds));
      url.searchParams.set("team_ids", teamIds.join(","));
      url.searchParams.set("teamId", teamIds[0]);
    }
    if (playerIds.length > 0) {
      url.searchParams.set("playerIds", JSON.stringify(playerIds));
      url.searchParams.set("player_ids", playerIds.join(","));
      url.searchParams.set("playerId", playerIds[0]);
    }
    if (teamNames.length > 0) {
      url.searchParams.set("teamNames", JSON.stringify(teamNames));
      url.searchParams.set("team_names", teamNames.join(","));
      url.searchParams.set("teamName", teamNames[0]);
    }
    if (playerNames.length > 0) {
      url.searchParams.set("playerNames", JSON.stringify(playerNames));
      url.searchParams.set("player_names", playerNames.join(","));
      url.searchParams.set("playerName", playerNames[0]);
    }
    url.searchParams.set("source", "superwidget-open-browser");

    const popup = window.open("about:blank", "_blank", "width=1440,height=900");
    if (!popup) {
      setWidgetPdfStates(prev => ({
        ...prev,
        [widgetId]: {
          loading: false,
          error: "Popup was blocked. Please allow popups and try again.",
          pdfUrl: prev[widgetId]?.pdfUrl,
        },
      }));
      return;
    }

    popup.location.href = url.toString();

    setWidgetPdfStates(prev => ({
      ...prev,
      [widgetId]: {
        loading: false,
        error: undefined,
        pdfUrl: prev[widgetId]?.pdfUrl,
      },
    }));
  }, [selectedWidgets, selectedTeams, selectedPlayers]);

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
          {/* Left Column - Widget + Parameter Selector */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-6">
              <WidgetSelector
                widgets={availableWidgets}
                selectedWidgetIds={selectedWidgetIds}
                onToggle={handleWidgetToggle}
                loading={loadingWidgets}
              />

              <p className="text-xs text-gray-600 px-1">
                Step 1: select widget(s). Step 2: select team/player parameters.
              </p>

              <ParameterSelector
                selectedTeams={selectedTeams}
                selectedPlayers={selectedPlayers}
                onTeamsChange={setSelectedTeams}
                onPlayersChange={setSelectedPlayers}
                overrideTeams={selectorSourceWidgetId && selectorTeams ? selectorTeams : undefined}
                overridePlayers={selectorSourceWidgetId && selectorPlayers ? selectorPlayers : undefined}
                overrideLabel={
                  selectorSourceWidgetId
                    ? selectorOptionsLoading
                      ? `Using ${selectorSourceWidgetName || "widget"} team/player options (loading...)`
                      : selectorOptionsError
                        ? `${selectorSourceWidgetName || "Widget"} options unavailable: ${selectorOptionsError}`
                        : selectorTeams && selectorPlayers
                          ? `Using ${selectorSourceWidgetName || "widget"} team/player options`
                          : `Using default team/player options`
                    : undefined
                }
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
                widgetOutputs={widgetOutputs}
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
                            <Badge variant={output.uiOnly || output.success ? "default" : "destructive"}>
                              {output.uiOnly ? "UI Widget" : output.success ? "Success" : "Failed"}
                            </Badge>
                          </div>

                          <div className="mb-3 flex items-center gap-3">
                            {!output.uiOnly ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportWidgetPdf(output.widgetId)}
                                disabled={widgetPdfStates[output.widgetId]?.loading}
                              >
                                {widgetPdfStates[output.widgetId]?.loading ? (
                                  <>
                                    <span className="inline-block animate-spin mr-2">⏳</span>
                                    Generating PDF...
                                  </>
                                ) : (
                                  <>📄 Export PDF</>
                                )}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenWidgetInBrowser(output.widgetId, output.redirectLink)}
                              >
                                🌐 Open in Browser
                              </Button>
                            )}
                            {widgetPdfStates[output.widgetId]?.pdfUrl && (
                              <a
                                href={widgetPdfStates[output.widgetId].pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm"
                              >
                                ↓ Download PDF
                              </a>
                            )}
                          </div>
                          {widgetPdfStates[output.widgetId]?.error && (
                            <p className="text-red-600 text-sm mb-3">
                              Error: {widgetPdfStates[output.widgetId].error}
                            </p>
                          )}

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
