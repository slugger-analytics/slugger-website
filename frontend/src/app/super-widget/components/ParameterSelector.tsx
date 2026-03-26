"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Badge } from "@/app/components/ui/badge";
import { ChevronDown, Loader2, Search, Target, X } from "lucide-react";

interface Team {
  id: string | number;
  name: string;
  wins?: number;
  losses?: number;
}

interface Player {
  id: string | number;
  name: string;
  teamId: string | number;
  position: string;
}

interface ParameterSelectorProps {
  selectedTeams: Team[];
  selectedPlayers: Player[];
  onTeamsChange: (teams: Team[]) => void;
  onPlayersChange: (players: Player[]) => void;
  overrideTeams?: Team[];
  overridePlayers?: Player[];
  overrideLabel?: string;
}

const DEFAULT_API_BASE = "http://localhost:3001";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_BASE;

const buildApiUrl = (path: string) => {
  if (!API_BASE_URL) return path;
  try {
    return new URL(path, API_BASE_URL).toString();
  } catch (error) {
    console.error("Invalid API URL", error);
    return path;
  }
};

function formatTeamLabel(team: Team): string {
  const n = String(team.name ?? "").trim();
  return n || `Team ${String(team.id)}`;
}

function formatPlayerLabel(player: Player): string {
  const n = String(player.name ?? "").trim();
  return n || `Player ${String(player.id)}`;
}

export function ParameterSelector({
  selectedTeams,
  selectedPlayers,
  onTeamsChange,
  onPlayersChange,
  overrideTeams,
  overridePlayers,
  overrideLabel,
}: ParameterSelectorProps) {
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [teamFilter, setTeamFilter] = useState("");
  const [playerFilter, setPlayerFilter] = useState("");
  const teamWrapRef = useRef<HTMLDivElement>(null);
  const playerWrapRef = useRef<HTMLDivElement>(null);

  const usingOverrideData = Boolean(overrideTeams && overridePlayers);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (teamWrapRef.current && !teamWrapRef.current.contains(t)) setShowTeamDropdown(false);
      if (playerWrapRef.current && !playerWrapRef.current.contains(t)) setShowPlayerDropdown(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setShowTeamDropdown(false);
      setShowPlayerDropdown(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!usingOverrideData) return;
    setAllTeams(overrideTeams || []);
    setAllPlayers(overridePlayers || []);
    setLoadingTeams(false);
    setLoadingPlayers(false);
  }, [usingOverrideData, overrideTeams, overridePlayers]);

  // Fetch available teams from API on component mount
  useEffect(() => {
    if (usingOverrideData) return;
    const fetchTeams = async () => {
      try {
        setLoadingTeams(true);
        const response = await fetch(buildApiUrl('/api/super-widget/parameterized-analysis'));
        if (response.ok) {
          const data = await response.json();
          setAllTeams(data.availableTeams || []);
        }
      } catch (error) {
        console.error('Error fetching teams:', error);
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchTeams();
  }, [usingOverrideData]);

  // Fetch available players from API on component mount
  useEffect(() => {
    if (usingOverrideData) return;
    const fetchPlayers = async () => {
      try {
        setLoadingPlayers(true);
        const response = await fetch(buildApiUrl('/api/super-widget/parameterized-analysis'));
        if (response.ok) {
          const data = await response.json();
          setAllPlayers(data.availablePlayers || []);
        }
      } catch (error) {
        console.error('Error fetching players:', error);
      } finally {
        setLoadingPlayers(false);
      }
    };

    fetchPlayers();
  }, [usingOverrideData]);

  const handleTeamToggle = (team: Team) => {
    const isSelected = selectedTeams.some(t => t.id === team.id);
    if (isSelected) {
      // Remove team and associated players
      const remainingTeams = selectedTeams.filter(t => t.id !== team.id);
      const remainingPlayers = selectedPlayers.filter(p => p.teamId !== team.id);
      onTeamsChange(remainingTeams);
      onPlayersChange(remainingPlayers);
    } else {
      onTeamsChange([...selectedTeams, team]);
    }
  };

  const handlePlayerToggle = (player: Player) => {
    const isSelected = selectedPlayers.some(p => p.id === player.id);
    if (isSelected) {
      onPlayersChange(selectedPlayers.filter(p => p.id !== player.id));
    } else {
      onPlayersChange([...selectedPlayers, player]);
    }
  };

  const removeTeam = (teamId: string | number) => {
    const team = allTeams.find(t => t.id === teamId);
    if (team) handleTeamToggle(team);
  };

  const removePlayer = (playerId: string | number) => {
    const player = allPlayers.find(p => p.id === playerId);
    if (player) handlePlayerToggle(player);
  };

  // Filter players by selected teams
  const availablePlayers = selectedTeams.length > 0 
    ? allPlayers.filter(p => selectedTeams.some(t => t.id === p.teamId))
    : allPlayers;

  const teamsForDropdown = useMemo(() => {
    const q = teamFilter.trim().toLowerCase();
    const list = q
      ? allTeams.filter((t) => formatTeamLabel(t).toLowerCase().includes(q))
      : allTeams;
    return [...list].sort((a, b) =>
      formatTeamLabel(a).localeCompare(formatTeamLabel(b), undefined, { sensitivity: "base" })
    );
  }, [allTeams, teamFilter]);

  const playerListFilter = playerFilter.trim().toLowerCase();
  const filteredPlayersForDropdown = playerListFilter
    ? availablePlayers.filter(
        (p) =>
          String(p.name ?? "").toLowerCase().includes(playerListFilter) ||
          String(p.position ?? "").toLowerCase().includes(playerListFilter)
      )
    : availablePlayers;

  const showTeamSearch = !loadingTeams && allTeams.length > 6;
  const showPlayerSearch =
    !loadingPlayers && selectedTeams.length > 0 && availablePlayers.length > 6;

  return (
    <Card className="w-full overflow-hidden rounded-2xl border-sky-200/70 bg-gradient-to-br from-sky-50/70 via-white to-white shadow-sm">
      <CardHeader className="space-y-0.5 pb-2 pt-1">
        <CardTitle className="mt-3 flex items-center gap-2 text-base font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700" aria-hidden>
            <Target className="h-4 w-4" />
          </span>
          Parameters
        </CardTitle>
        <CardDescription className="text-xs">Teams first, then players from those rosters.</CardDescription>
        {usingOverrideData && overrideLabel && (
          <CardDescription className="rounded-lg border border-indigo-100 bg-indigo-50/80 px-2.5 py-2 text-xs text-indigo-800">
            {overrideLabel}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3 pb-4 pt-0">
        {/* Team Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-800" htmlFor="team-dropdown-trigger">
            Teams
          </label>
          <div ref={teamWrapRef} className="space-y-2">
            <button
              type="button"
              id="team-dropdown-trigger"
              onClick={() => {
                setShowTeamDropdown((open) => {
                  const next = !open;
                  if (next) setTeamFilter("");
                  return next;
                });
                setPlayerFilter("");
              }}
              disabled={loadingTeams}
              aria-haspopup="listbox"
              aria-expanded={showTeamDropdown}
              aria-controls="team-dropdown-panel"
              className="flex w-full items-center justify-between rounded-lg border border-sky-200 bg-white px-2.5 py-2 text-left text-xs font-medium text-sky-900 shadow-sm transition hover:bg-sky-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-gray-700">
                {loadingTeams ? (
                  <span className="inline-flex items-center gap-2 font-normal">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" aria-hidden />
                    Loading teams…
                  </span>
                ) : showTeamDropdown ? (
                  "Hide team list"
                ) : selectedTeams.length > 0 ? (
                  `Choose teams (${selectedTeams.length} selected)`
                ) : (
                  "Choose teams"
                )}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 transition-transform ${showTeamDropdown ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>

            {showTeamDropdown && !loadingTeams && (
              <div
                id="team-dropdown-panel"
                role="listbox"
                aria-labelledby="team-dropdown-trigger"
                className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
              >
                {showTeamSearch && (
                  <div className="border-b border-gray-100 bg-white p-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" aria-hidden />
                      <input
                        type="search"
                        value={teamFilter}
                        onChange={(e) => setTeamFilter(e.target.value)}
                        placeholder="Filter teams…"
                        autoComplete="off"
                        aria-label="Filter teams"
                        className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-2 text-xs focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                )}
                <div className="max-h-44 overflow-y-auto overscroll-contain py-1">
                  {allTeams.length > 0 ? (
                    teamsForDropdown.length > 0 ? (
                      teamsForDropdown.map((team) => (
                        <label
                          key={team.id}
                          role="option"
                          aria-selected={selectedTeams.some((t) => t.id === team.id)}
                          className="flex cursor-pointer items-center border-b border-gray-50 px-3 py-2 last:border-0 hover:bg-sky-50/80"
                        >
                          <Checkbox
                            checked={selectedTeams.some((t) => t.id === team.id)}
                            onCheckedChange={() => handleTeamToggle(team)}
                            className="h-4 w-4"
                          />
                          <span className="ml-2 text-xs leading-tight text-gray-700">{formatTeamLabel(team)}</span>
                        </label>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-gray-500">No teams match your filter.</div>
                    )
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-4 text-center text-xs text-gray-500">
                      No teams available
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Selected Teams Display */}
            {selectedTeams.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTeams.map((team) => (
                  <Badge key={team.id} variant="secondary" className="flex items-center gap-1 bg-blue-100 pr-1 text-xs text-blue-800">
                    {formatTeamLabel(team)}
                    <button
                      type="button"
                      onClick={() => removeTeam(team.id)}
                      className="rounded p-0.5 text-blue-700 hover:bg-blue-200/60 hover:text-blue-900"
                      aria-label={`Remove ${formatTeamLabel(team)}`}
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Player Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-800" htmlFor="player-dropdown-trigger">
            Players
            {selectedTeams.length === 0 && (
              <span className="ml-1 font-normal text-gray-400">(select teams first)</span>
            )}
          </label>
          <div ref={playerWrapRef} className="space-y-2">
            <button
              type="button"
              id="player-dropdown-trigger"
              onClick={() => {
                if (selectedTeams.length === 0) return;
                setShowPlayerDropdown((open) => {
                  const next = !open;
                  if (next) setPlayerFilter("");
                  return next;
                });
                setTeamFilter("");
              }}
              disabled={selectedTeams.length === 0 || loadingPlayers}
              aria-haspopup="listbox"
              aria-expanded={showPlayerDropdown}
              aria-controls="player-dropdown-panel"
              className="flex w-full items-center justify-between rounded-lg border border-sky-200 bg-white px-2.5 py-2 text-left text-xs font-medium text-sky-900 shadow-sm transition hover:bg-sky-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-gray-700">
                {loadingPlayers ? (
                  <span className="inline-flex items-center gap-2 font-normal">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" aria-hidden />
                    Loading players…
                  </span>
                ) : showPlayerDropdown ? (
                  "Hide player list"
                ) : selectedPlayers.length > 0 ? (
                  `Choose players (${selectedPlayers.length} selected)`
                ) : (
                  "Choose players"
                )}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 transition-transform ${showPlayerDropdown ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>

            {showPlayerDropdown && !loadingPlayers && selectedTeams.length > 0 && (
              <div
                id="player-dropdown-panel"
                role="listbox"
                aria-labelledby="player-dropdown-trigger"
                className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
              >
                {showPlayerSearch && availablePlayers.length > 0 && (
                  <div className="border-b border-gray-100 bg-white p-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" aria-hidden />
                      <input
                        type="search"
                        value={playerFilter}
                        onChange={(e) => setPlayerFilter(e.target.value)}
                        placeholder="Filter players…"
                        autoComplete="off"
                        aria-label="Filter players"
                        className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-2 text-xs focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                )}
                <div className="max-h-44 overflow-y-auto overscroll-contain py-1">
                  {availablePlayers.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-4 text-center text-xs text-gray-500">
                      No players for the selected teams.
                    </div>
                  ) : filteredPlayersForDropdown.length > 0 ? (
                    filteredPlayersForDropdown.map((player) => {
                      const team = allTeams.find((t) => t.id === player.teamId);
                      return (
                        <label
                          key={player.id}
                          role="option"
                          aria-selected={selectedPlayers.some((p) => p.id === player.id)}
                          className="flex cursor-pointer items-center border-b border-gray-50 px-3 py-2 last:border-0 hover:bg-emerald-50/60"
                        >
                          <Checkbox
                            checked={selectedPlayers.some((p) => p.id === player.id)}
                            onCheckedChange={() => handlePlayerToggle(player)}
                            className="h-4 w-4"
                          />
                          <span className="ml-2 text-xs leading-tight text-gray-700">
                            {formatPlayerLabel(player)} ({player.position || "—"}) —{" "}
                            {team ? formatTeamLabel(team) : "Unknown team"}
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2 text-xs text-gray-500">No players match your filter.</div>
                  )}
                </div>
              </div>
            )}

            {/* Selected Players Display */}
            {selectedPlayers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedPlayers.map((player) => (
                  <Badge key={player.id} variant="outline" className="flex items-center gap-1 border-green-200 bg-green-50 pr-1 text-xs text-green-800">
                    {formatPlayerLabel(player)}
                    <button
                      type="button"
                      onClick={() => removePlayer(player.id)}
                      className="rounded p-0.5 text-green-800 hover:bg-green-200/50 hover:text-green-950"
                      aria-label={`Remove ${formatPlayerLabel(player)}`}
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {(selectedTeams.length > 0 || selectedPlayers.length > 0) && (
          <div className="rounded-lg border border-sky-100 bg-sky-50/60 px-2.5 py-2">
            <p className="text-xs text-gray-700">
              <span className="font-semibold text-gray-800">Scope:</span>
              {selectedTeams.length > 0 && ` ${selectedTeams.length} team${selectedTeams.length !== 1 ? "s" : ""}`}
              {selectedTeams.length > 0 && selectedPlayers.length > 0 && " · "}
              {selectedPlayers.length > 0 && `${selectedPlayers.length} player${selectedPlayers.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
