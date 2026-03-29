"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Badge } from "@/app/components/ui/badge";
import { Loader2, Sparkles, BarChart3 } from "lucide-react";
import { WidgetType } from "@/data/types";
import { fetchWidgetOutputs, fetchWidgets, WidgetExecutionResult } from "@/api/widget";
import { useStore } from "@nanostores/react";
import { $user } from "@/lib/userStore";
import {
  calculateCombinedWidgetMetrics,
  generateWidgetInsights,
  generateWidgetRecommendations,
  generateWidgetSummary
} from "./utils/widgetAnalysis";

interface SuperWidgetAnalysis {
  summary: string;
  insights: string[];
  recommendations: string[];
  combinedMetrics: {
    totalLaunches: number;
    avgWeeklyLaunches: number;
    topCategories: string[];
  };
}

interface SavedAnalysis {
  id: string;
  name: string;
  selectedWidgetIds: number[];
  analysis: SuperWidgetAnalysis;
  createdAt: string;
}

export default function SuperWidgetPage() {
  const [availableWidgets, setAvailableWidgets] = useState<WidgetType[]>([]);
  const [selectedWidgetIds, setSelectedWidgetIds] = useState<number[]>([]);
  const [analysis, setAnalysis] = useState<SuperWidgetAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [widgetOutputs, setWidgetOutputs] = useState<WidgetExecutionResult[]>([]);
  const user = useStore($user);

  const loadAvailableWidgets = useCallback(async () => {
    try {
      setLoading(true);
      if (!user.id) {
        console.log("No user ID available, skipping widget load");
        setAvailableWidgets([]);
        return;
      }
      const widgets = await fetchWidgets(user.id);
      setAvailableWidgets(widgets);
    } catch (error) {
      console.error("Error loading widgets:", error);
      setAvailableWidgets([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, []); // Remove user.id dependency

  const loadSavedAnalyses = useCallback(() => {
    if (typeof window === "undefined" || !user.id) return;

    try {
      const key = `superWidgetAnalyses_${user.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setSavedAnalyses(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading saved analyses:", error);
    }
  }, []); // Remove user.id dependency

  const saveAnalysis = () => {
    if (!analysis || !saveName.trim()) return;

    const newSavedAnalysis: SavedAnalysis = {
      id: Date.now().toString(),
      name: saveName.trim(),
      selectedWidgetIds: [...selectedWidgetIds],
      analysis: { ...analysis },
      createdAt: new Date().toISOString()
    };

    const updated = [...savedAnalyses, newSavedAnalysis];
    setSavedAnalyses(updated);

    // Save to localStorage
    if (typeof window !== "undefined" && user.id) {
      const key = `superWidgetAnalyses_${user.id}`;
      localStorage.setItem(key, JSON.stringify(updated));
    }

    setShowSaveDialog(false);
    setSaveName("");
  };

  const loadSavedAnalysis = (saved: SavedAnalysis) => {
    setSelectedWidgetIds(saved.selectedWidgetIds);
    setAnalysis(saved.analysis);
  };

  const deleteSavedAnalysis = (id: string) => {
    const updated = savedAnalyses.filter(a => a.id !== id);
    setSavedAnalyses(updated);

    if (typeof window !== "undefined" && user.id) {
      const key = `superWidgetAnalyses_${user.id}`;
      localStorage.setItem(key, JSON.stringify(updated));
    }
  };

  const handleWidgetSelection = (widgetId: number, checked: boolean) => {
    if (checked) {
      setSelectedWidgetIds(prev => [...prev, widgetId]);
    } else {
      setSelectedWidgetIds(prev => prev.filter(id => id !== widgetId));
    }
  };

  const generateAIAnalysis = async () => {
    if (selectedWidgetIds.length === 0) return;

    setIsAnalyzing(true);
    try {
      const selectedWidgets = availableWidgets.filter(w => selectedWidgetIds.includes(w.id));

      const directOutputs = await fetchWidgetOutputs(selectedWidgetIds, {
        source: "superwidget-script"
      });
      setWidgetOutputs(directOutputs);

      // Enhanced AI analysis based on widget metadata and metrics
      const metrics = calculateCombinedWidgetMetrics(selectedWidgets);
      const analysis: SuperWidgetAnalysis = {
        summary: generateWidgetSummary(selectedWidgets),
        insights: generateWidgetInsights(selectedWidgets),
        recommendations: generateWidgetRecommendations(selectedWidgets),
        combinedMetrics: {
          totalLaunches: metrics.totalLaunches,
          avgWeeklyLaunches: metrics.avgWeeklyLaunches,
          topCategories: metrics.topCategories
        }
      };

      setAnalysis(analysis);
    } catch (error) {
      console.error("Error generating analysis:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (user.id) {
      loadAvailableWidgets();
      loadSavedAnalyses();
    }
  }, [user.id, loadAvailableWidgets, loadSavedAnalyses]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user.id) {
    return (
      <div className="container mx-auto p-6 max-w-4xl text-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
            <Sparkles className="h-8 w-8 text-blue-600" />
            Super Widget Analyzer
          </h1>
          <p className="text-gray-600">
            AI-powered analysis tool for combining insights from multiple baseball analytics widgets
          </p>
        </div>
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <p className="text-gray-600 mb-4">
              Please log in to access the Super Widget Analyzer and analyze your widgets.
            </p>
            <Button asChild>
              <a href="/sign-in">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-blue-600" />
          Super Widget Analyzer
        </h1>
        <p className="text-gray-600">
          Select multiple widgets to generate AI-powered insights and combined analytics
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Widget Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Select Widgets to Analyze
            </CardTitle>
            <CardDescription>
              Choose widgets to include in your AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableWidgets.length > 0 ? (
                availableWidgets.map((widget) => (
                  <div key={widget.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <Checkbox
                      id={`widget-${widget.id}`}
                      checked={selectedWidgetIds.includes(widget.id)}
                      onCheckedChange={(checked) =>
                        handleWidgetSelection(widget.id, checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={`widget-${widget.id}`}
                        className="font-medium cursor-pointer"
                      >
                        {widget.name}
                      </label>
                      <p className="text-sm text-gray-600 mt-1">{widget.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {widget.categories.map((cat) => (
                          <Badge key={cat.id} variant="secondary" className="text-xs">
                            {cat.name}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {widget.metrics.weeklyLaunches} weekly launches
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No widgets available for analysis.</p>
                  <p className="text-sm mt-1">Create some widgets first to use the analyzer.</p>
                </div>
              )}
            </div>

            <Button
              onClick={generateAIAnalysis}
              disabled={selectedWidgetIds.length === 0 || isAnalyzing}
              className="w-full mt-4"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating AI Analysis...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate AI Analysis ({selectedWidgetIds.length} selected)
                </>
              )}
            </Button>

            {analysis && (
              <Button
                onClick={() => setShowSaveDialog(true)}
                variant="outline"
                className="w-full mt-2"
              >
                💾 Save Analysis
              </Button>
            )}
          </CardContent>
        </Card>

        {/* AI Analysis Results */}
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis Results</CardTitle>
            <CardDescription>
              Insights generated from selected widgets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analysis ? (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Summary</h3>
                  <p className="text-gray-700">{analysis.summary}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Key Insights</h3>
                  <ul className="space-y-1">
                    {analysis.insights.map((insight, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span className="text-gray-700">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Recommendations</h3>
                  <ul className="space-y-1">
                    {analysis.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-green-600 mt-1">•</span>
                        <span className="text-gray-700">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3">Combined Metrics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {analysis.combinedMetrics.totalLaunches.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Total Launches</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {analysis.combinedMetrics.avgWeeklyLaunches.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Avg Weekly Launches</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-sm font-medium mb-1">Top Categories:</div>
                    <div className="flex flex-wrap gap-1">
                      {analysis.combinedMetrics.topCategories.map((cat) => (
                        <Badge key={cat} variant="outline">{cat}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select widgets and click &ldquo;Generate AI Analysis&rdquo; to see insights</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Direct Widget Outputs */}
        <Card>
          <CardHeader>
            <CardTitle>Widget Script Outputs</CardTitle>
            <CardDescription>
              Direct output fetched from selected widgets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {widgetOutputs.length > 0 ? (
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
                            <span className="text-blue-600 mt-1">•</span>
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
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select widgets and run analysis to fetch live outputs.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saved Analyses */}
        <Card>
          <CardHeader>
            <CardTitle>Saved Analyses</CardTitle>
            <CardDescription>
              Load previous analyses or save current results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {savedAnalyses.length > 0 ? (
              <div className="space-y-3">
                {savedAnalyses.map((saved) => (
                  <div key={saved.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{saved.name}</h4>
                      <p className="text-sm text-gray-600">
                        {saved.selectedWidgetIds.length} widgets • {new Date(saved.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadSavedAnalysis(saved)}
                      >
                        Load
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteSavedAnalysis(saved.id)}
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No saved analyses yet. Generate and save an analysis to see it here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Save Analysis Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Save Analysis</CardTitle>
              <CardDescription>
                Give this analysis a name to save it for later
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Analysis Name</label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="e.g., Q4 Analytics Review"
                    className="w-full p-2 border rounded-md"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveAnalysis} disabled={!saveName.trim()}>
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
