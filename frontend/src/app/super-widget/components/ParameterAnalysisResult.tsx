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
  Activity
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

  if (!hasSelections && selectedWidgets.length === 0) {
    return (
      <Card className="w-full border-gray-200 opacity-60">
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Select teams, players, or widgets to start the analysis.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full border-blue-200">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10">
          <Activity className="h-6 w-6 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">Running analysis with selected widgets…</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader className="flex flex-row items-center gap-2">
          <AlertTriangle className="text-red-500" />
          <CardTitle>Analysis Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const analysisData = analysis?.data;
  const metadata = analysis?.metadata;
  const teamAnalysis = analysisData?.teamAnalysis ?? [];
  const playerAnalysis = analysisData?.playerAnalysis ?? [];

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

  const comparativeInsights = analysisData?.comparativeInsights ?? [];
  const keyInsights = analysisData?.insights ?? [];
  const recommendations = analysisData?.recommendations ?? [];

  return (
    <div className="space-y-4 w-full">
      {/* Summary */}
      <Card className="w-full border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-900">
            <Sparkles className="text-emerald-600" />
            SuperWidget Analysis
          </CardTitle>
          {metadata?.dataSource && (
            <CardDescription>
              Data source: {metadata.dataSource}{metadata.season ? ` • Season ${metadata.season}` : ""}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-700">
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
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <BarChart3 className="text-blue-600" />
              Team Performance Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamAnalysis.map((team) => (
              <div key={team.teamId} className="border border-blue-100 rounded-lg p-4 bg-blue-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-blue-900">{team.teamName}</h4>
                    <p className="text-xs text-blue-700 mt-1">
                      Record: {(team.wins ?? 0)}-{(team.losses ?? 0)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-blue-200 text-blue-900">
                    {formatPerformance(team.avgPerformance)}
                  </Badge>
                </div>
                {team.statusSummary && (
                  <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-900 border border-blue-200">
                    <p className="font-semibold mb-1 flex items-center gap-1">
                      <span className="text-blue-600">📰</span> Latest News
                    </p>
                    <p className="italic">{team.statusSummary}</p>
                  </div>
                )}
                <div className="mt-3 text-xs text-blue-800 space-y-1">
                  <p>Win %: {formatWinPct(team.topMetrics?.winPercentage)}</p>
                  <p>Players in sample: {team.playerCount}</p>
                  {typeof team.topMetrics?.offensiveRating === "number" && (
                    <p>Offensive rating: {Math.round(team.topMetrics.offensiveRating)}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Player Highlights */}
      {topPlayers.length > 0 && (
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Users className="text-purple-600" />
              Player Highlights
            </CardTitle>
            <CardDescription>Ranked by performance score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topPlayers.map((player) => (
              <div key={player.playerId} className="flex flex-wrap justify-between gap-2 border border-purple-100 rounded-lg p-3 bg-purple-50">
                <div>
                  <p className="font-medium text-purple-900">{player.playerName}</p>
                  <p className="text-xs text-purple-700">{player.team} • {player.position} • Score {Math.round(player.performanceScore)}</p>
                </div>
                <p className="text-xs text-purple-800">{formatKeyStats(player)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Widget Modules */}
      {widgetInsights.length > 0 && (
        <Card className="border-emerald-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-900">
              <Puzzle className="text-emerald-600" />
              Widget-Driven Modules
            </CardTitle>
            <CardDescription>Each widget contributes targeted analysis for the current selection.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {widgetInsights.map((block) => (
              <div key={block.widget.id} className="border border-emerald-100 rounded-lg p-4 bg-emerald-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-emerald-900">{block.widget.name}</p>
                  <Badge variant="secondary" className="bg-emerald-200 text-emerald-900 capitalize">
                    {block.focus}
                  </Badge>
                </div>
                <p className="text-xs text-emerald-800 mb-2">{block.headline}</p>
                <ul className="space-y-1 text-xs text-emerald-700">
                  {block.bullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-600">•</span>
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
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <Target className="text-amber-600" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {keyInsights.map((insight, index) => (
              <div key={`insight-${index}`} className="flex items-start gap-3 text-sm text-amber-800">
                <span className="text-amber-600 font-bold">•</span>
                <span>{insight}</span>
              </div>
            ))}

            {comparativeInsights.map((insight, index) => (
              <div key={`comparative-${index}`} className="flex items-start gap-3 text-sm text-amber-800">
                <span className="text-amber-600 font-bold">•</span>
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
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <ListChecks className="text-slate-700" />
              Recommended Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            {recommendations.map((rec, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-slate-500">{index + 1}.</span>
                <span>{rec}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Selection Summary */}
      {(selectedTeams.length > 0 || selectedPlayers.length > 0 || selectedWidgets.length > 0) && (
        <Card className="border-gray-200 bg-gray-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-700">Selection Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedTeams.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Teams</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTeams.map((team) => (
                    <Badge key={team.id} variant="secondary" className="bg-blue-100 text-blue-800">
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
                    <Badge key={player.id} variant="outline" className="bg-green-50 text-green-800 border-green-200">
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
                    <Badge key={widget.id} variant="secondary" className="bg-purple-100 text-purple-800">
                      {widget.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
