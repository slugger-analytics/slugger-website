import { WidgetType } from "@/data/types";
import {
  ParameterizedAnalysisPayload,
  ParameterizedPlayerAnalysis,
  ParameterizedTeamAnalysis,
  WidgetInsightBlock
} from "../types";

const toFixed = (value: number | undefined, decimals = 3): string => {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return value.toFixed(decimals);
};

const percent = (value: number | undefined, decimals = 1): string => {
  if (typeof value !== "number" || Number.isNaN(value)) return "N/A";
  return `${(value * 100).toFixed(decimals)}%`;
};

export const detectWidgetFocus = (widget: WidgetType): string => {
  const name = widget.name?.toLowerCase() ?? "";
  const description = widget.description?.toLowerCase() ?? "";
  const categories = (widget.categories ?? []).map((category) => category.name?.toLowerCase() ?? "");
  const corpus = `${name} ${description} ${categories.join(" ")}`;

  if (corpus.includes("hit") || corpus.includes("bat")) return "hitting";
  if (corpus.includes("pitch")) return "pitching";
  if (corpus.includes("team") || corpus.includes("standings") || corpus.includes("dashboard")) return "team";
  if (corpus.includes("scout") || corpus.includes("prospect")) return "scouting";
  if (corpus.includes("report")) return "reports";
  if (corpus.includes("finance") || corpus.includes("salary") || corpus.includes("budget")) return "finance";
  return "general";
};

const focusLabelMap: Record<string, string> = {
  hitting: "hitting analysis",
  pitching: "pitching matchups",
  team: "team dashboards",
  scouting: "scouting funnels",
  reports: "report packaging",
  finance: "financial planning",
  general: "multi-purpose workflows"
};

const groupWidgetsByFocus = (widgets: WidgetType[]): Record<string, WidgetType[]> => {
  return widgets.reduce<Record<string, WidgetType[]>>((acc, widget) => {
    const focus = detectWidgetFocus(widget);
    if (!acc[focus]) acc[focus] = [];
    acc[focus].push(widget);
    return acc;
  }, {});
};

const weeklyLaunches = (widget: WidgetType): number => widget.metrics?.weeklyLaunches ?? 0;

const byNumberDesc = (accessor: (item: ParameterizedPlayerAnalysis) => number | undefined) =>
  (a: ParameterizedPlayerAnalysis, b: ParameterizedPlayerAnalysis) => (accessor(b) ?? -Infinity) - (accessor(a) ?? -Infinity);

const deriveHittingBullets = (players: ParameterizedPlayerAnalysis[]): string[] => {
  if (players.length === 0) {
    return ["No batting metrics available for the current selection."];
  }

  const pickNumber = (...values: Array<number | undefined>): number | undefined => {
    for (const value of values) {
      if (typeof value === "number" && !Number.isNaN(value)) {
        return value;
      }
    }
    return undefined;
  };

  const enriched = players.map((player) => {
    const sample = player.battingSample ?? undefined;
    const avg = pickNumber(player.keyStats.avg, sample?.avg);
    const hr = pickNumber(player.keyStats.hr, sample?.homeRuns);
    const rbi = pickNumber(player.keyStats.rbi, sample?.rbi);
    const hits = pickNumber(player.keyStats.hits, sample?.hits);
    const atBats = pickNumber(player.keyStats.atBats, sample?.atBats);

    return {
      player,
      avg,
      hr,
      rbi,
      hits,
      atBats
    };
  });

  const hittersWithAvg = enriched
    .filter((entry) => typeof entry.avg === "number")
    .sort((a, b) => (b.avg ?? -Infinity) - (a.avg ?? -Infinity));
  const hittersWithHr = enriched
    .filter((entry) => typeof entry.hr === "number")
    .sort((a, b) => (b.hr ?? -Infinity) - (a.hr ?? -Infinity));
  const hittersWithRbi = enriched
    .filter((entry) => typeof entry.rbi === "number")
    .sort((a, b) => (b.rbi ?? -Infinity) - (a.rbi ?? -Infinity));

  const bullets: string[] = [];

  if (hittersWithAvg[0] && typeof hittersWithAvg[0].avg === "number") {
    const { player, avg, atBats } = hittersWithAvg[0];
    const sampleText = typeof atBats === "number" && atBats > 0 ? ` across ${Math.round(atBats)} AB` : "";
    const teamText = player.team ? ` for ${player.team}` : "";
    bullets.push(`${player.playerName} leads at the plate with a ${toFixed(avg)} average${sampleText}${teamText}.`);
  }

  if (hittersWithHr[0] && typeof hittersWithHr[0].hr === "number") {
    const { player, hr } = hittersWithHr[0];
    const teamText = player.team ? ` for ${player.team}` : "";
    bullets.push(`${player.playerName} tops the power chart with ${Math.round(hr)} home runs${teamText}.`);
  }

  if (hittersWithRbi[0] && typeof hittersWithRbi[0].rbi === "number") {
    const { player, rbi } = hittersWithRbi[0];
    const teamText = player.team ? ` for ${player.team}` : "";
    bullets.push(`${player.playerName} drives in runs effectively with ${Math.round(rbi)} RBIs${teamText}.`);
  }

  if (bullets.length === 0) {
    bullets.push("Selected hitters lack batting sample data. Verify CSV mapping to unlock AVG/HR/RBI insights.");
  }

  return bullets;
};

const derivePitchingBullets = (players: ParameterizedPlayerAnalysis[]): string[] => {
  if (players.length === 0) {
    return ["No pitching data is available for the current selection."];
  }

  const byEra = players.filter((player) => typeof player.keyStats.era === "number").sort(byNumberDesc((p) => -1 * (p.keyStats.era ?? Infinity)));
  const byStrikeouts = players.filter((player) => typeof player.keyStats.so === "number").sort(byNumberDesc((p) => p.keyStats.so));
  const byInnings = players.filter((player) => typeof player.keyStats.ip === "number").sort(byNumberDesc((p) => p.keyStats.ip));

  const bullets: string[] = [];

  if (byEra[0]) {
    const player = byEra[0];
    bullets.push(`${player.playerName} posts a standout ${toFixed(player.keyStats.era, 2)} ERA.`);
  }

  if (byStrikeouts[0]) {
    const player = byStrikeouts[0];
    bullets.push(`${player.playerName} leads the staff with ${player.keyStats.so} strikeouts.`);
  }

  if (byInnings[0]) {
    const player = byInnings[0];
    bullets.push(`${player.playerName} provides workload stability with ${toFixed(player.keyStats.ip, 1)} innings pitched.`);
  }

  if (bullets.length === 0) {
    bullets.push("Pitching selections lack ERA/SO/IP metrics. Add pitchers with recorded outings to analyze performance.");
  }

  return bullets;
};

const deriveTeamBullets = (teams: ParameterizedTeamAnalysis[]): string[] => {
  if (teams.length === 0) {
    return ["No team performance data available for this selection."];
  }

  const sortedByWinPct = teams
    .map((team) => ({
      team,
      winPct: typeof team.topMetrics?.winPercentage === "number" ? team.topMetrics.winPercentage : undefined,
    }))
    .sort((a, b) => (b.winPct ?? -Infinity) - (a.winPct ?? -Infinity));

  const bullets: string[] = [];

  if (sortedByWinPct[0]?.team) {
    const { team, winPct } = sortedByWinPct[0];
    const pctValue = winPct ?? (typeof team.avgPerformance === "number" ? team.avgPerformance / 100 : undefined);
    bullets.push(`${team.teamName} shows the strongest form with a ${percent(pctValue)} win profile.`);
  }

  const highestRosterDepth = teams
    .slice()
    .sort((a, b) => (b.playerCount ?? 0) - (a.playerCount ?? 0))[0];
  if (highestRosterDepth) {
    bullets.push(`${highestRosterDepth.teamName} contributes the deepest sample (${highestRosterDepth.playerCount} players).`);
  }

  return bullets.length > 0 ? bullets : ["Team metrics do not include win-rate data for this selection."];
};

const deriveScoutingBullets = (players: ParameterizedPlayerAnalysis[]): string[] => {
  if (players.length === 0) {
    return ["Add players to surface scouting priorities."];
  }

  const ranked = players
    .slice()
    .sort((a, b) => (b.performanceScore ?? 0) - (a.performanceScore ?? 0))
    .slice(0, 3);

  return ranked.map((player, index) => `${index + 1}. ${player.playerName} (${player.team}) • Score ${Math.round(player.performanceScore)} • Role ${player.position}`);
};

const deriveReportsBullets = (analysis: ParameterizedAnalysisPayload): string[] => {
  const bullets: string[] = [];

  if (analysis.insights.length > 0) {
    bullets.push(...analysis.insights.slice(0, 3));
  }

  if (analysis.comparativeInsights.length > 0) {
    bullets.push(`Key matchup: ${analysis.comparativeInsights[0].description}`);
  }

  if (analysis.recommendations.length > 0) {
    bullets.push(`Action item: ${analysis.recommendations[0]}`);
  }

  return bullets.length > 0 ? bullets : ["Run analysis to unlock actionable summary points."];
};

const deriveFinanceBullets = (): string[] => [
  "Financial modeling widgets require payroll or budget feeds. Connect finance data sources to enable this module."
];

const deriveGeneralBullets = (analysis: ParameterizedAnalysisPayload): string[] => {
  const bullets: string[] = [];

  if (analysis.summary) {
    bullets.push(analysis.summary);
  }

  if (analysis.recommendations.length > 0) {
    bullets.push(...analysis.recommendations.slice(0, 2));
  }

  if (bullets.length === 0) {
    bullets.push("Select teams or players to generate combined analysis.");
  }

  return bullets;
};

export const calculateCombinedWidgetMetrics = (widgets: WidgetType[]) => {
  if (widgets.length === 0) {
    return {
      totalLaunches: 0,
      avgWeeklyLaunches: 0,
      topCategories: [] as string[]
    };
  }

  const totalLaunches = widgets.reduce((sum, widget) => sum + weeklyLaunches(widget), 0);
  const avgWeeklyLaunches = Math.round(totalLaunches / widgets.length);

  const categoryCounts = new Map<string, number>();
  widgets.forEach((widget) => {
    (widget.categories ?? []).forEach((category) => {
      if (!category?.name) return;
      categoryCounts.set(category.name, (categoryCounts.get(category.name) ?? 0) + 1);
    });
  });

  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  return {
    totalLaunches,
    avgWeeklyLaunches,
    topCategories
  };
};

export const generateWidgetSummary = (widgets: WidgetType[]): string => {
  if (widgets.length === 0) {
    return "Select widgets to generate an overview.";
  }

  const focusGroups = groupWidgetsByFocus(widgets);
  const focusLabels = Object.keys(focusGroups)
    .map((focus) => focusLabelMap[focus] ?? focus)
    .join(", ");

  const metrics = calculateCombinedWidgetMetrics(widgets);
  const topCategories = metrics.topCategories.length > 0 ? `Categories: ${metrics.topCategories.join(", ")}.` : "";
  const spotlight = widgets
    .slice(0, 3)
    .map((widget) => widget.name)
    .join(", ");
  const suffix = widgets.length > 3 ? " and others" : "";

  return `Configured ${widgets.length} widget${widgets.length > 1 ? "s" : ""} covering ${focusLabels || "multi-purpose workflows"}. Spotlight: ${spotlight}${suffix}. ${topCategories}`.trim();
};

export const generateWidgetInsights = (widgets: WidgetType[]): string[] => {
  if (widgets.length === 0) {
    return ["Add widgets to surface talent, matchup, and reporting insights."];
  }

  const metrics = calculateCombinedWidgetMetrics(widgets);
  const focusGroups = groupWidgetsByFocus(widgets);
  const insights: string[] = [];

  if (focusGroups.hitting) {
    insights.push(`Hitting stack (${focusGroups.hitting.length}) unlocks contact quality, spray charts, and platoon planning.`);
  }

  if (focusGroups.pitching) {
    insights.push(`Pitching modules (${focusGroups.pitching.length}) highlight pitch-mix tendencies and game-plan adjustments.`);
  }

  if (focusGroups.team) {
    insights.push(`Team dashboards (${focusGroups.team.length}) surface standings context and win-share trajectories.`);
  }

  if (focusGroups.scouting) {
    insights.push(`Scouting workflows (${focusGroups.scouting.length}) streamline prospect grading and compare drill results.`);
  }

  if (focusGroups.reports) {
    insights.push(`Report builders (${focusGroups.reports.length}) package insights for coaches and front office distribution.`);
  }

  if (metrics.totalLaunches > 0) {
    insights.push(`Weekly reach ~${metrics.totalLaunches.toLocaleString()} launches (avg ${metrics.avgWeeklyLaunches.toLocaleString()} per widget).`);
  }

  if (metrics.topCategories.length > 0) {
    insights.push(`Top categories represented: ${metrics.topCategories.join(", ")}.`);
  }

  if (insights.length === 0) {
    insights.push("Widgets provide flexible baseball analysis coverage—pair with parameterized data to deepen storytelling.");
  }

  return insights;
};

export const generateWidgetRecommendations = (widgets: WidgetType[]): string[] => {
  if (widgets.length === 0) {
    return ["Select at least one widget to receive tailored recommendations."];
  }

  const focusGroups = groupWidgetsByFocus(widgets);
  const metrics = calculateCombinedWidgetMetrics(widgets);
  const recommendations: string[] = [];

  if (focusGroups.hitting && !focusGroups.pitching) {
    recommendations.push("Add a pitching analytics widget to balance game preparation on both sides of the ball.");
  }

  if (focusGroups.pitching && !focusGroups.hitting) {
    recommendations.push("Pair pitching tools with a hitting or team-offense widget to round out scouting packets.");
  }

  if (focusGroups.team && !focusGroups.reports) {
    recommendations.push("Layer in a report automation widget to distribute team dashboards to coaches quickly.");
  }

  if (focusGroups.scouting && focusGroups.reports) {
    recommendations.push("Sync scouting outputs with report builders to produce ready-to-share draft or trade briefs.");
  }

  if (metrics.totalLaunches === 0) {
    recommendations.push("Connect widget usage tracking to benchmark adoption and surface engagement trends.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Use parameterized analysis with selected teams to transform these widgets into actionable baseball insights.");
  }

  return recommendations;
};

const buildWidgetInsight = (
  widget: WidgetType,
  analysis: ParameterizedAnalysisPayload,
  battingPlayers: ParameterizedPlayerAnalysis[],
  pitchingPlayers: ParameterizedPlayerAnalysis[]
): WidgetInsightBlock | null => {
  const focus = detectWidgetFocus(widget);
  let headline = "Widget insight";
  let bullets: string[] = [];

  switch (focus) {
    case "hitting":
      headline = "Batting impact spotlight";
      bullets = deriveHittingBullets(battingPlayers);
      break;
    case "pitching":
      headline = "Pitching efficiency report";
      bullets = derivePitchingBullets(pitchingPlayers);
      break;
    case "team":
      headline = "Team performance dashboard";
      bullets = deriveTeamBullets(analysis.teamAnalysis);
      break;
    case "scouting":
      headline = "Scouting short list";
      bullets = deriveScoutingBullets(analysis.playerAnalysis);
      break;
    case "reports":
      headline = "Executive summary";
      bullets = deriveReportsBullets(analysis);
      break;
    case "finance":
      headline = "Finance data required";
      bullets = deriveFinanceBullets();
      break;
    default:
      headline = "Widget-driven overview";
      bullets = deriveGeneralBullets(analysis);
  }

  if (bullets.length === 0) return null;

  return {
    widget,
    focus,
    headline,
    bullets,
  };
};

export const buildWidgetInsights = (
  widgets: WidgetType[],
  analysis?: ParameterizedAnalysisPayload | null
): WidgetInsightBlock[] => {
  if (!analysis || widgets.length === 0) return [];

  const battingPlayers = analysis.playerAnalysis.filter((player) => player.playerType === "batting");
  const pitchingPlayers = analysis.playerAnalysis.filter((player) => player.playerType === "pitching");

  return widgets
    .map((widget) => buildWidgetInsight(widget, analysis, battingPlayers, pitchingPlayers))
    .filter((insight): insight is WidgetInsightBlock => Boolean(insight));
};
