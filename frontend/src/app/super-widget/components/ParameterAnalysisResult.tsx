"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { WidgetType } from "@/data/types";
import {
  BarChart3,
  Users,
  Sparkles,
  Target,
  ListChecks,
  Clock3,
  AlertTriangle,
  Puzzle,
  Loader2,
  Newspaper,
} from "lucide-react";
import { buildWidgetInsights, detectWidgetFocus } from "../utils/widgetAnalysis";
import { ParameterizedAnalysisResponse, ParameterizedPlayerAnalysis, WidgetInsightBlock } from "../types";
import type { WidgetExecutionResult } from "@/api/widget";

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

interface ParameterAnalysisProps {
  selectedTeams: Team[];
  selectedPlayers: Player[];
  selectedWidgets: WidgetType[];
  analysis: ParameterizedAnalysisResponse | null;
  widgetOutputs?: WidgetExecutionResult[];
  loading: boolean;
  error?: string | null;
}

const formatKeyStats = (player: ParameterizedPlayerAnalysis): string => {
  const stats = player.keyStats || {};
  const sample = player.battingSample ?? undefined;
  const entries: string[] = [];

  const pickNumber = (...values: Array<number | undefined>): number | undefined => {
    for (const value of values) {
      if (typeof value === "number" && !Number.isNaN(value)) {
        return value;
      }
    }
    return undefined;
  };

  const pushStat = (label: string, value: number | undefined, digits = 2) => {
    if (typeof value === "number" && !Number.isNaN(value)) {
      entries.push(`${label} ${value.toFixed(digits)}`);
    }
  };

  if (player.playerType === "batting") {
    const avg = pickNumber(stats.avg, sample?.avg);
    const hr = pickNumber(stats.hr, sample?.homeRuns);
    const rbi = pickNumber(stats.rbi, sample?.rbi);
    const hits = pickNumber(stats.hits, sample?.hits);
    const atBats = pickNumber(stats.atBats, sample?.atBats);

    pushStat("AVG", avg, 3);
    if (typeof hr === "number") entries.push(`HR ${Math.round(hr)}`);
    if (typeof rbi === "number") entries.push(`RBI ${Math.round(rbi)}`);

    if (entries.length < 3 && typeof hits === "number" && typeof atBats === "number" && atBats > 0) {
      entries.push(`${Math.round(hits)}/${Math.round(atBats)} AB`);
    }

    if (entries.length === 0) {
      const fallback = Object.entries(stats)
        .filter(([, value]) => typeof value === "number")
        .slice(0, 3)
        .map(([key, value]) => `${key.toUpperCase()} ${(value as number).toFixed(2)}`);
      entries.push(...fallback);
    }
  } else if (player.playerType === "pitching") {
    pushStat("ERA", stats.era);
    if (typeof stats.so === "number") entries.push(`SO ${stats.so}`);
    pushStat("IP", stats.ip, 1);
    if (entries.length === 0) {
      const fallback = Object.entries(stats)
        .filter(([, value]) => typeof value === "number")
        .slice(0, 3)
        .map(([key, value]) => `${key.toUpperCase()} ${(value as number).toFixed(2)}`);
      entries.push(...fallback);
    }
  } else {
    const fallback = Object.entries(stats)
      .filter(([, value]) => typeof value === "number")
      .slice(0, 3)
      .map(([key, value]) => `${key.toUpperCase()} ${(value as number).toFixed(2)}`);
    entries.push(...fallback);
  }

  return entries.join(" • ") || "No stat line available";
};

const formatWinPct = (value?: number): string => {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
};

const formatPerformance = (value?: number): string => {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return `${Math.round(value)} / 100`;
};

const performancePct = (value?: number): number => {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
};

export function ParameterAnalysisResult({
  selectedTeams,
  selectedPlayers,
  selectedWidgets,
  analysis,
  widgetOutputs = [],
  loading,
  error
}: ParameterAnalysisProps) {
  const hasSelections = selectedTeams.length > 0 || selectedPlayers.length > 0;
  const analysisData = analysis?.data;

  const fallbackWidgetInsights: WidgetInsightBlock[] = useMemo(
    () => buildWidgetInsights(selectedWidgets, analysisData),
    [selectedWidgets, analysisData]
  );

  const widgetInsights: WidgetInsightBlock[] = useMemo(() => {
    if (selectedWidgets.length === 0) return [];

    const outputMap = new Map<number, WidgetExecutionResult>();
    widgetOutputs.forEach((output) => {
      outputMap.set(output.widgetId, output);
    });

    const fallbackMap = new Map<number, WidgetInsightBlock>();
    fallbackWidgetInsights.forEach((insight) => {
      fallbackMap.set(insight.widget.id, insight);
    });

    return selectedWidgets
      .map((widget) => {
        const output = outputMap.get(widget.id);
        if (output && Array.isArray(output.bullets) && output.bullets.length > 0) {
          return {
            widget,
            focus: detectWidgetFocus(widget),
            headline: output.success ? "Direct widget output" : "Widget execution feedback",
            bullets: output.bullets,
          } as WidgetInsightBlock;
        }

        return fallbackMap.get(widget.id) ?? null;
      })
      .filter((insight): insight is WidgetInsightBlock => Boolean(insight));
  }, [selectedWidgets, widgetOutputs, fallbackWidgetInsights]);

  const topPlayers: ParameterizedPlayerAnalysis[] = useMemo(() => {
    if (!analysisData) return [];
    return (analysisData.playerAnalysis ?? [])
      .slice()
      .sort((a, b) => (b.performanceScore ?? 0) - (a.performanceScore ?? 0))
      .slice(0, 6);
  }, [analysisData]);

  if (!hasSelections && selectedWidgets.length === 0) {
    return (
      <Card className="w-full rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Sparkles className="h-8 w-8 text-gray-300" aria-hidden />
          <div className="max-w-sm space-y-1">
            <p className="text-xs font-medium text-gray-700">Nothing to analyze yet</p>
            <p className="text-xs text-gray-500">
              Add widgets and at least one team or player in the left column to generate a report.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full overflow-hidden rounded-2xl border-emerald-200/60 bg-gradient-to-br from-emerald-50/60 to-white shadow-sm">
        <CardContent
          className="flex flex-col items-center justify-center gap-3 py-12"
          aria-busy="true"
          aria-live="polite"
        >
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" aria-hidden />
          <p className="text-xs font-medium text-gray-700">Running analysis with selected widgets…</p>
          <p className="text-xs text-gray-500">This may take a moment.</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full rounded-2xl border-red-200/80 bg-red-50/30 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <CardTitle className="mt-3 text-base font-semibold text-red-900">Analysis error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-gray-700">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const metadata = analysis?.metadata;
  const teamAnalysis = analysisData?.teamAnalysis ?? [];
  const playerAnalysis = analysisData?.playerAnalysis ?? [];

  const comparativeInsights = analysisData?.comparativeInsights ?? [];
  const keyInsights = analysisData?.insights ?? [];
  const recommendations = analysisData?.recommendations ?? [];

  return (
    <div className="w-full space-y-4">
      {/* Selection Summary */}
      {(selectedTeams.length > 0 || selectedPlayers.length > 0 || selectedWidgets.length > 0) && (
        <Card className="overflow-hidden rounded-2xl border-gray-200/80 bg-gray-50/60 shadow-sm">
          <CardHeader className="space-y-0.5 pb-2 pt-1">
            <CardTitle className="mt-3 flex items-center gap-2 text-base font-semibold text-gray-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                <Users className="h-4 w-4" />
              </span>
              Selection summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedTeams.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Teams</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTeams.map((team) => (
                    <Badge key={team.id} variant="secondary" className="bg-blue-100 text-xs text-blue-800">
                      {team.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedPlayers.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Players</p>
                <div className="flex flex-wrap gap-2">
                  {selectedPlayers.map((player) => (
                    <Badge key={player.id} variant="outline" className="border-green-200 bg-green-50 text-xs text-green-800">
                      {player.name} ({player.position})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedWidgets.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Widgets</p>
                <div className="flex flex-wrap gap-2">
                  {selectedWidgets.map((widget) => (
                    <Badge key={widget.id} variant="secondary" className="bg-purple-100 text-xs text-purple-800">
                      {widget.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card className="w-full overflow-hidden rounded-2xl border-emerald-200/60 bg-gradient-to-br from-emerald-50/90 via-white to-white shadow-sm">
        <CardHeader className="space-y-0.5 pb-2 pt-1">
          <CardTitle className="mt-3 flex items-center gap-1.5 text-base font-semibold text-emerald-950">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Sparkles className="h-4 w-4" />
            </span>
            SuperWidget analysis
          </CardTitle>
          {metadata?.dataSource && (
            <CardDescription className="text-xs">
              Data source: {metadata.dataSource}{metadata.season ? ` • Season ${metadata.season}` : ""}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-gray-700">
            {analysisData?.summary || "Select teams and players to generate the combined report."}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              Teams: {metadata?.selectedTeams ?? selectedTeams.length}
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              Players: {metadata?.selectedPlayers ?? selectedPlayers.length}
            </div>
            <div className="flex items-center gap-2">
              <Puzzle className="h-4 w-4 text-emerald-600" />
              Widgets: {selectedWidgets.length}
            </div>
            {metadata?.processingTime !== undefined && (
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-emerald-600" />
                Processing {metadata.processingTime} ms
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Team Performance */}
      {teamAnalysis.length > 0 && (
        <Card className="overflow-hidden rounded-2xl border-blue-200/60 bg-gradient-to-br from-blue-50/50 via-white to-white shadow-sm">
          <CardHeader className="space-y-0.5 pb-2 pt-1">
            <CardTitle className="mt-3 flex items-center gap-2 text-base font-semibold text-blue-950">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <BarChart3 className="h-4 w-4" />
              </span>
              Team performance
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {teamAnalysis.map((team) => {
              const pct = performancePct(team.avgPerformance);
              return (
                <div
                  key={team.teamId}
                  className="rounded-xl border border-blue-100/80 bg-blue-50/60 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-blue-950">{team.teamName}</h4>
                      <p className="mt-1 text-xs text-blue-800/90">
                        Record: {team.wins ?? 0}-{team.losses ?? 0}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 bg-blue-200/90 text-xs text-blue-950">
                      {formatPerformance(team.avgPerformance)}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-blue-700/80">
                      <span>Performance</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-blue-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-sky-400 transition-[width] duration-300"
                        style={{ width: `${pct}%` }}
                        role="progressbar"
                        aria-valuenow={pct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>
                  {team.statusSummary && (
                    <div className="mt-3 rounded-lg border border-blue-200/80 bg-blue-100/50 p-2 text-xs text-blue-950">
                      <p className="mb-1 flex items-center gap-1.5 font-semibold text-blue-900">
                        <Newspaper className="h-3.5 w-3.5 text-blue-600" />
                        Latest news
                      </p>
                      <p className="italic leading-relaxed text-blue-900/90">{team.statusSummary}</p>
                    </div>
                  )}
                  <div className="mt-3 space-y-1 text-xs text-blue-900/85">
                    <p>Win %: {formatWinPct(team.topMetrics?.winPercentage)}</p>
                    <p>Players in sample: {team.playerCount}</p>
                    {typeof team.topMetrics?.offensiveRating === "number" && (
                      <p>Offensive rating: {Math.round(team.topMetrics.offensiveRating)}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Player Highlights */}
      {topPlayers.length > 0 && (
        <Card className="overflow-hidden rounded-2xl border-violet-200/60 bg-gradient-to-br from-violet-50/40 via-white to-white shadow-sm">
          <CardHeader className="space-y-0.5 pb-2 pt-1">
            <CardTitle className="mt-3 flex items-center gap-2 text-base font-semibold text-violet-950">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                <Users className="h-4 w-4" />
              </span>
              Player highlights
            </CardTitle>
            <CardDescription className="text-xs">Ranked by performance score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topPlayers.map((player) => (
              <div
                key={player.playerId}
                className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-violet-100/80 bg-violet-50/50 p-3 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-violet-950">{player.playerName}</p>
                  <p className="text-xs text-violet-800/90">
                    {player.team} • {player.position} • Score {Math.round(player.performanceScore)}
                  </p>
                </div>
                <p className="max-w-full text-xs leading-snug text-violet-900/85">{formatKeyStats(player)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Widget Modules */}
      {widgetInsights.length > 0 && (
        <Card className="overflow-hidden rounded-2xl border-teal-200/60 bg-gradient-to-br from-teal-50/35 via-white to-white shadow-sm">
          <CardHeader className="space-y-0.5 pb-2 pt-1">
            <CardTitle className="mt-3 flex items-center gap-2 text-base font-semibold text-teal-950">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-700">
                <Puzzle className="h-4 w-4" />
              </span>
              Widget-driven modules
            </CardTitle>
            <CardDescription className="text-xs">
              Each widget contributes targeted analysis for the current selection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {widgetInsights.map((block) => (
              <div
                key={block.widget.id}
                className="rounded-xl border border-teal-100/80 bg-teal-50/40 p-4 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-teal-950">{block.widget.name}</p>
                  <Badge variant="secondary" className="shrink-0 bg-teal-200/90 text-xs capitalize text-teal-950">
                    {block.focus}
                  </Badge>
                </div>
                <p className="mb-2 text-xs text-teal-900/85">{block.headline}</p>
                <ul className="space-y-1 text-xs text-teal-900/80">
                  {block.bullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-teal-600">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Key Insights & Comparative Notes */}
      {(keyInsights.length > 0 || comparativeInsights.length > 0) && (
        <Card className="overflow-hidden rounded-2xl border-amber-200/60 bg-gradient-to-br from-amber-50/70 via-white to-white shadow-sm">
          <CardHeader className="space-y-0.5 pb-2 pt-1">
            <CardTitle className="mt-3 flex items-center gap-2 text-base font-semibold text-amber-950">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Target className="h-4 w-4" />
              </span>
              Key insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {keyInsights.map((insight, index) => (
              <div key={`insight-${index}`} className="flex items-start gap-3 text-xs text-amber-950/90">
                <span className="font-bold text-amber-600">•</span>
                <span>{insight}</span>
              </div>
            ))}

            {comparativeInsights.map((insight, index) => (
              <div key={`comparative-${index}`} className="flex items-start gap-3 text-xs text-amber-950/90">
                <span className="font-bold text-amber-600">•</span>
                <span>
                  <strong>{insight.title}:</strong> {insight.description}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="overflow-hidden rounded-2xl border-slate-200/70 bg-gradient-to-br from-slate-50/80 via-white to-white shadow-sm">
          <CardHeader className="space-y-0.5 pb-2 pt-1">
            <CardTitle className="mt-3 flex items-center gap-2 text-base font-semibold text-slate-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <ListChecks className="h-4 w-4" />
              </span>
              Recommended actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-slate-800">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-2 rounded-lg border border-slate-100 bg-white/80 px-3 py-2">
                <span className="font-medium text-slate-500 tabular-nums">{index + 1}.</span>
                <span>{rec}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
