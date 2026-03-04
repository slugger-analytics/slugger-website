"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { $standings } from "@/lib/widgetStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/app/components/ui/select";

const ALL_TEAMS = "__all__";

type Props = {
  value: string;
  onChange: (team: string) => void;
  triggerClassName?: string;
};

const TeamDropdown = ({ value, onChange, triggerClassName = "" }: Props) => {
  const standingsData = useStore($standings);

  const liveTeams = useMemo(() => {
    const names = new Set<string>();
    standingsData?.standings?.conference?.forEach((conf) =>
      conf.division.forEach((div) =>
        div.team.forEach((t) => names.add(t.teamname)),
      ),
    );
    return Array.from(names).sort();
  }, [standingsData]);

  const [stableTeams, setStableTeams] = useState<string[]>([]);
  useEffect(() => {
    if (liveTeams.length > 0) setStableTeams(liveTeams);
  }, [liveTeams]);

  if (!stableTeams.length) {
    return <div className="h-9 w-48 animate-pulse rounded-md bg-white/20" />;
  }

  return (
    <Select
      value={value || ALL_TEAMS}
      onValueChange={(v) => onChange(v === ALL_TEAMS ? "" : v)}
    >
      <SelectTrigger className={`w-48 ${triggerClassName}`}>
        {/* Render label directly so it never flashes blank when SelectItems re-render */}
        <span className={value ? "" : "text-gray-400"}>
          {value || "All Teams"}
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_TEAMS}>All Teams</SelectItem>
        {stableTeams.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default TeamDropdown;
