"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Badge } from "@/app/components/ui/badge";
import { Loader2, Puzzle } from "lucide-react";
import { WidgetType } from "@/data/types";

interface WidgetSelectorProps {
  widgets: WidgetType[];
  selectedWidgetIds: number[];
  onToggle: (widgetId: number, checked: boolean) => void;
  loading: boolean;
}

export function WidgetSelector({ widgets, selectedWidgetIds, onToggle, loading }: WidgetSelectorProps) {
  return (
    <Card className="w-full border-purple-200 bg-gradient-to-br from-purple-50 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Puzzle className="h-5 w-5 text-purple-600" />
          Widgets In Analysis
        </CardTitle>
        <CardDescription>Select widgets whose logic should inform this analysis</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6 text-purple-600">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : widgets.length === 0 ? (
          <div className="text-sm text-gray-500">
            No widgets available. Ensure you have widgets registered or adjust access permissions.
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {widgets.map((widget) => (
              <label key={widget.id} className="flex items-start gap-3 p-3 border border-purple-100 rounded-lg hover:bg-purple-50 cursor-pointer">
                <Checkbox
                  checked={selectedWidgetIds.includes(widget.id)}
                  onCheckedChange={(checked) => onToggle(widget.id, Boolean(checked))}
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-800">{widget.name}</div>
                  {widget.description && (
                    <p className="text-xs text-gray-600 mt-1">{widget.description}</p>
                  )}
                  {widget.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {widget.categories.map((category) => (
                        <Badge key={category.id} variant="outline" className="text-[10px]">
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="text-[11px] text-gray-500 mt-1">
                    {widget.metrics.weeklyLaunches.toLocaleString()} weekly launches • Visibility: {widget.visibility ?? "unknown"}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
