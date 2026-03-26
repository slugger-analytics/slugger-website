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
import { Loader2, LayoutDashboard, Check, FileText } from "lucide-react";

function scrollToId(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
  el?.focus({ preventScroll: true });
}

function StepChip({
  n,
  label,
  active,
  onPress,
}: {
  n: number;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={`Jump to ${label}: step ${n}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition hover:brightness-[0.98] focus-visible:outline focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 ${
        active
          ? "border-indigo-200 bg-indigo-50 text-indigo-800"
          : "border-gray-200 bg-gray-50 text-gray-500"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
          active ? "bg-indigo-600 text-white" : "bg-white text-gray-400 border border-gray-200"
        }`}
        aria-hidden
      >
        {n}
      </span>
      {label}
    </button>
  );
}

interface Team {
  id: string | number;
  name: string;
}

interface Player {
  id: string | number;
  name: string;
  teamId: string | number;
  position: string;
  sourceLabel?: string;
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
        setSelectorTeams([]);
        setSelectorPlayers([]);
        const data = await fetchWidgetSelectorOptions(selectorSourceWidgetId);
        const teams = (data.teams || []) as Team[];
        const players = (data.players || []) as Player[];
        const widgetName = data.widgetName || selectorSourceWidget?.name || "widget";

        setSelectorSourceWidgetName(widgetName);

        setSelectorTeams(teams);
        setSelectorPlayers(players);

        if (teams.length === 0 || players.length === 0) {
          setSelectorOptionsError(`${widgetName} has no mappable team/player options.`);
        }
      } catch (error) {
        console.error("Error loading widget selector options:", error);
        setSelectorTeams([]);
        setSelectorPlayers([]);
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
      .map(player => player.sourceLabel || player.name)
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
    const widget = selectedWidgets.find((item) => item.id === widgetId);
    const redirectLink = directLink || widget?.redirectLink;

    if (!redirectLink) {
      setWidgetPdfStates((prev) => ({
        ...prev,
        [widgetId]: {
          loading: false,
          error: "Widget redirect URL is missing",
          pdfUrl: prev[widgetId]?.pdfUrl,
        },
      }));
      return;
    }

    try {
      const parsedRedirect = new URL(redirectLink);
      const url = new URL(`${parsedRedirect.origin}${parsedRedirect.pathname}`);

      const teamIds = selectedTeams
        .map((team) => team.id)
        .filter((id) => id !== undefined && id !== null)
        .map((id) => String(id));
      const playerIds = selectedPlayers
        .map((player) => player.id)
        .filter((id) => id !== undefined && id !== null)
        .map((id) => String(id));

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
      url.searchParams.set("source", "superwidget-open-browser");

      const popup = window.open(url.toString(), "_blank", "width=1440,height=900");
      if (!popup) {
        setWidgetPdfStates((prev) => ({
          ...prev,
          [widgetId]: {
            loading: false,
            error: "Popup was blocked. Please allow popups and try again.",
            pdfUrl: prev[widgetId]?.pdfUrl,
          },
        }));
        return;
      }

      setWidgetPdfStates((prev) => ({
        ...prev,
        [widgetId]: {
          loading: false,
          error: undefined,
          pdfUrl: prev[widgetId]?.pdfUrl,
        },
      }));
    } catch (error) {
      setWidgetPdfStates((prev) => ({
        ...prev,
        [widgetId]: {
          loading: false,
          error: (error as Error)?.message ?? "Invalid widget URL",
          pdfUrl: prev[widgetId]?.pdfUrl,
        },
      }));
    }
  }, [selectedWidgets, selectedTeams, selectedPlayers]);

  const stepWidgets = selectedWidgetIds.length > 0;
  const stepParams = selectedTeams.length > 0 || selectedPlayers.length > 0;
  const stepResults = stepWidgets && stepParams;

  const nextStepHint = !stepWidgets
    ? "Start by selecting one or more widgets on the left."
    : !stepParams
      ? "Pick teams, then players from those rosters to run the full report."
      : "Scroll down for analysis and widget script outputs.";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/30">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
        {/* Header */}
        <div className="mb-6 rounded-2xl border border-gray-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-1.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-200">
                <LayoutDashboard className="h-4 w-4" aria-hidden />
              </div>
              <div className="w-full">
                <p className="text-xl font-bold tracking-tight text-gray-900">
                  SuperWidget Analysis
                </p>
                <p className="mt-3 max-w-2xl text-sm text-gray-600">
                  Choose widgets, then teams and players, and get combined insights and script outputs in one place.
                </p>
              </div>
            </div>
            <div className="flex w-full max-w-md flex-col items-stretch gap-3 md:max-w-lg md:items-end">
              <div className="w-full rounded-xl border border-gray-200/80 bg-white/95 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-gray-900">Usage tips</h3>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <StepChip n={1} label="Widgets" active={stepWidgets} onPress={() => scrollToId("sw-setup")} />
                    <StepChip n={2} label="Parameters" active={stepParams} onPress={() => scrollToId("sw-setup")} />
                    <StepChip n={3} label="Results" active={stepResults} onPress={() => scrollToId("sw-results")} />
                  </div>
                </div>
                <p className="mb-3 text-xs text-gray-500">{nextStepHint}</p>
                <ul className="ml-auto space-y-2 text-left text-xs text-gray-600">
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
                    <span>Multi-select teams and players from the left column.</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
                    <span>Results refresh as you change widgets or filters.</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
                    <span>Use Export PDF or open a widget in the browser when available.</span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
                    <span>Expand “Raw output” under each widget for full payload.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {/* Left Column - Widget + Parameter Selector */}
          <div className="lg:col-span-1">
            <div
              id="sw-setup"
              tabIndex={-1}
              className="sticky top-6 scroll-mt-24 space-y-5 outline-none"
            >
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
                          : `Using ${selectorSourceWidgetName || "widget"} team/player options`
                    : undefined
                }
              />
            </div>
          </div>

          {/* Right Column - Analysis Result */}
          <div className="lg:col-span-2">
            <div
              id="sw-results"
              tabIndex={-1}
              className="scroll-mt-24 space-y-5 outline-none"
            >
              <ParameterAnalysisResult
                selectedTeams={selectedTeams}
                selectedPlayers={selectedPlayers}
                selectedWidgets={selectedWidgets}
                analysis={analysis}
                widgetOutputs={widgetOutputs}
                loading={analysisLoading}
                error={analysisError}
              />

              <Card
                className="overflow-hidden rounded-2xl border-indigo-100/80 shadow-sm"
                role="region"
                aria-label="Widget script outputs"
              >
                <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-indigo-50/50 to-white pb-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="mt-3 flex items-center gap-2 text-base font-semibold">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                          <FileText className="h-4 w-4" />
                        </span>
                        Widget script outputs
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        Live results from each selected widget for your current teams and players.
                      </CardDescription>
                    </div>
                    {widgetOutputs.length > 0 && (
                      <Badge variant="secondary" className="shrink-0 bg-indigo-100 text-xs text-indigo-800">
                        {widgetOutputs.length} active
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  {widgetOutputsLoading ? (
                    <div className="flex items-center gap-3 py-4 text-gray-600">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                      <span className="text-xs">Fetching widget outputs…</span>
                    </div>
                  ) : widgetOutputsError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-3 text-xs text-red-800">
                      {widgetOutputsError}
                    </div>
                  ) : widgetOutputs.length > 0 ? (
                    <div className="space-y-4">
                      {widgetOutputs.map((output) => (
                        <div key={output.widgetId} className="rounded-lg border p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <h4 className="truncate text-sm font-semibold text-gray-900">{output.widgetName}</h4>
                            <Badge className="shrink-0 text-xs" variant={output.uiOnly || output.success ? "default" : "destructive"}>
                              {output.uiOnly ? "UI Widget" : output.success ? "Success" : "Failed"}
                            </Badge>
                          </div>

                          <div className="mb-3 flex items-center gap-3">
                            {!output.uiOnly ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs"
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
                                className="h-8 text-xs"
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
                                className="text-xs text-blue-600 hover:underline"
                              >
                                ↓ Download PDF
                              </a>
                            )}
                          </div>
                          {widgetPdfStates[output.widgetId]?.error && (
                            <p className="mb-3 text-xs text-red-600">
                              Error: {widgetPdfStates[output.widgetId].error}
                            </p>
                          )}

                          {output.bullets.length > 0 && (
                            <ul className="mb-3 space-y-1">
                              {output.bullets.map((bullet, index) => (
                                <li key={index} className="flex items-start gap-2 text-xs text-gray-700">
                                  <span className="text-indigo-600 mt-1">•</span>
                                  <span>{bullet}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          <div className="bg-gray-50 rounded-md p-2">
                            <p className="mb-2 text-xs text-gray-500">Raw Output</p>
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
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center">
                      <p className="text-xs font-medium text-gray-700">No script outputs yet</p>
                      <p className="mx-auto mt-2 max-w-md text-xs text-gray-500">
                        {!stepWidgets && !stepParams && "Choose widgets and at least one team or player."}
                        {stepWidgets && !stepParams && "Add teams or players so widgets can run against real ids."}
                        {!stepWidgets && stepParams && "Select widgets to fetch their script outputs."}
                        {stepWidgets && stepParams && "Outputs will appear here once the request completes."}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
