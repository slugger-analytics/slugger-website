"use client";

import { useStore } from "@nanostores/react";
import { $visibilityFilter } from "@/lib/widgetStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

export default function VisibilityFilter() {
  const visibilityFilter = useStore($visibilityFilter);

  return (
    <Select
      value={visibilityFilter}
      onValueChange={(value) =>
        $visibilityFilter.set(value as "all" | "active" | "hidden")
      }
    >
      <SelectTrigger className="ml-3 w-[180px] bg-white" aria-label="Show widgets">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All widgets</SelectItem>
        <SelectItem value="active">Active widgets</SelectItem>
        <SelectItem value="hidden">Hidden widgets</SelectItem>
      </SelectContent>
    </Select>
  );
}
