import { WidgetType } from "@/data/types";

export interface ParameterizedTeamAnalysis {
  teamId: string | number;
  teamName: string;
  avgPerformance?: number;
  playerCount: number;
  wins?: number;
  losses?: number;
  statusSummary?: string;
  topMetrics?: Record<string, number | undefined> & {
    winPercentage?: number;
    selectedPlayers?: number;
    offensiveRating?: number;
  };
}

export interface ParameterizedPlayerAnalysis {
  playerId: string | number;
  playerName: string;
  position: string;
  team: string;
  performanceScore: number;
  playerType: string;
  keyStats: Record<string, number | undefined>;
  battingSample?: {
    playerId: string;
    playerName: string;
    atBats: number;
    hits: number;
    homeRuns: number;
    rbi: number;
    avg: number;
  } | null;
}

export interface ParameterizedComparativeInsight {
  title: string;
  description: string;
  impact: string;
}

export interface ParameterizedAnalysisPayload {
  summary: string;
  insights: string[];
  teamAnalysis: ParameterizedTeamAnalysis[];
  playerAnalysis: ParameterizedPlayerAnalysis[];
  comparativeInsights: ParameterizedComparativeInsight[];
  recommendations: string[];
}

export interface ParameterizedAnalysisMetadata {
  selectedTeams: number;
  selectedPlayers: number;
  processingTime: number;
  analysisScope: string;
  dataSource: string;
  season?: string;
  battingMetrics?: {
    source: string;
    path?: string;
  };
}

export interface ParameterizedAnalysisResponse {
  success: boolean;
  data: ParameterizedAnalysisPayload;
  metadata: ParameterizedAnalysisMetadata;
}

export interface WidgetInsightBlock {
  widget: WidgetType;
  focus: string;
  headline: string;
  bullets: string[];
}
