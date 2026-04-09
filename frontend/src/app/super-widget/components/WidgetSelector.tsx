"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Badge } from "@/app/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";
import { CheckCheck, ChevronDown, Loader2, Puzzle } from "lucide-react";
import { WidgetType } from "@/data/types";

interface WidgetSelectorProps {
  widgets: WidgetType[];
  selectedWidgetIds: number[];
  onToggle: (widgetId: number, checked: boolean) => void;
  loading: boolean;
}

function shortWidgetDescription(desc?: string | null): string {
  const t = desc?.trim();
  if (!t) return "No description available.";
  return t.length > 160 ? `${t.slice(0, 157)}…` : t;
}

function formatWidgetName(widget: WidgetType): string {
  const n = String(widget.name ?? "").trim();
  return n || `Widget ${widget.id}`;
}

export function WidgetSelector({ widgets, selectedWidgetIds, onToggle, loading }: WidgetSelectorProps) {
  const [expanded, setExpanded] = useState(false);

  const sortedWidgets = useMemo(() => {
    return [...widgets].sort((a, b) =>
      formatWidgetName(a).localeCompare(formatWidgetName(b), undefined, { sensitivity: "base" })
    );
  }, [widgets]);

  const allOn = widgets.length > 0 && widgets.every((w) => selectedWidgetIds.includes(w.id));

  const selectAll = () => {
    widgets.forEach((w) => {
      if (!selectedWidgetIds.includes(w.id)) onToggle(w.id, true);
    });
  };

  const clearAll = () => {
    widgets.forEach((w) => {
      if (selectedWidgetIds.includes(w.id)) onToggle(w.id, false);
    });
  };

  return (
    <Card className="w-full overflow-hidden rounded-2xl border-violet-200/60 bg-gradient-to-br from-violet-50/80 via-white to-white shadow-sm">
      <CardHeader className="space-y-0.5 pb-2 pt-1">
        <CardTitle className="mt-3 flex items-center gap-2 text-base font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
            <Puzzle className="h-4 w-4" />
          </span>
          Widgets in analysis
        </CardTitle>
        <CardDescription className="text-xs">Pick which widgets feed this run.</CardDescription>
        {selectedWidgetIds.length > 0 && (
          <p className="text-xs font-medium text-violet-700">
            {selectedWidgetIds.length} selected
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2 pb-4 pt-0">
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between rounded-lg border border-violet-200 bg-white px-2.5 py-2 text-left text-xs font-medium text-violet-800 shadow-sm transition hover:bg-violet-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200"
        >
          <span>
            {expanded
              ? "Hide widget options"
              : `Choose widgets${selectedWidgetIds.length > 0 ? ` (${selectedWidgetIds.length} selected)` : ""}`}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        {expanded && (
          <>
            {!loading && widgets.length > 1 && (
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={allOn}
                  className="inline-flex items-center gap-0.5 rounded-full border border-violet-200 bg-white px-2 py-0.5 font-medium text-violet-700 shadow-sm hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCheck className="h-3 w-3" />
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={selectedWidgetIds.length === 0}
                  className="rounded-full border border-gray-200 bg-white px-2 py-0.5 font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Clear
                </button>
              </div>
            )}
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-violet-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Loading widgets…</span>
              </div>
            ) : widgets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 py-5 text-center text-xs text-gray-500">
                No widgets available. Check registration or permissions.
              </div>
            ) : (
              <TooltipProvider delayDuration={250}>
                <div className="max-h-44 space-y-1 overflow-y-auto overscroll-contain pr-0.5" role="list">
                  {sortedWidgets.map((widget) => {
                    const on = selectedWidgetIds.includes(widget.id);
                    const tip = shortWidgetDescription(widget.description);
                    return (
                      <Tooltip key={widget.id}>
                        <TooltipTrigger asChild>
                          <label
                            role="listitem"
                            className={`block cursor-pointer rounded-lg border px-2 py-1.5 transition-colors ${
                              on
                                ? "border-violet-300 bg-violet-50/90 shadow-sm ring-1 ring-violet-200"
                                : "border-gray-100 bg-white hover:border-violet-100 hover:bg-violet-50/30"
                            }`}
                          >
                            <div className="flex items-start gap-1.5">
                              <Checkbox
                                checked={on}
                                onCheckedChange={(c) => onToggle(widget.id, Boolean(c))}
                                className="mt-0.5 h-4 w-4"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium leading-tight text-gray-900">{formatWidgetName(widget)}</div>
                              </div>
                            </div>
                            <div className="mt-1 pl-5">
                              {widget.categories.length > 0 && (
                                <div className="mt-0 flex flex-wrap gap-0.5">
                                  {widget.categories.map((category) => (
                                    <Badge key={category.id} variant="outline" className="px-1 py-0 text-[9px] font-normal leading-none">
                                      {category.name}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              <p className="mt-0.5 text-[10px] leading-tight text-gray-500">
                                {widget.metrics.weeklyLaunches.toLocaleString()} launches · {widget.visibility ?? "unknown"}
                              </p>
                            </div>
                          </label>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="start" className="max-w-xs border border-gray-200 bg-gray-900 text-gray-50">
                          <p className="font-medium text-gray-50">{formatWidgetName(widget)}</p>
                          <p className="mt-1 text-left text-[11px] font-normal leading-snug text-gray-200">{tip}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
