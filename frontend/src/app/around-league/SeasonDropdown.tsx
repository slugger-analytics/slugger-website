"use client";

import React, { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { fetchSeasons, SeasonOption } from "@/api/league";

type Props = {
  value: string;
  onChange: (year: string) => void;
};

const SeasonDropdown = ({ value, onChange }: Props) => {
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchSeasons()
      .then(({ seasons: list, currentYear }) => {
        setSeasons(list);
        if (!value) {
          onChange(currentYear);
        }
        setLoaded(true);
      })
      .catch(() => {
        const fallback = String(new Date().getFullYear());
        setSeasons([{ year: fallback, label: `${fallback} (Current)`, isCurrent: true }]);
        if (!value) onChange(fallback);
        setLoaded(true);
      });
  }, []);

  if (!loaded) {
    return (
      <div className="h-9 w-36 animate-pulse rounded-md bg-gray-200" />
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Select season" />
      </SelectTrigger>
      <SelectContent>
        {seasons.map((s) => (
          <SelectItem key={s.year} value={s.year}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default SeasonDropdown;
