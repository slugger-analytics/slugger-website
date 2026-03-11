"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Badge } from "@/app/components/ui/badge";
import { ChevronDown, X } from "lucide-react";

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

  const usingOverrideData = Boolean(overrideTeams && overridePlayers);

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

  return (
    <Card className="w-full border-blue-200 bg-gradient-to-br from-blue-50 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-lg">🎯 Custom Analysis Parameters</span>
        </CardTitle>
        <CardDescription>Select specific teams and players for targeted analysis</CardDescription>
        {usingOverrideData && overrideLabel && (
          <CardDescription className="text-xs text-indigo-700">
            {overrideLabel}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Select Teams (Multi-select)
          </label>
          <div className="relative">
            <button
              onClick={() => setShowTeamDropdown(!showTeamDropdown)}
              disabled={loadingTeams}
              className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex justify-between items-center"
            >
              <span className="text-gray-600">
                {loadingTeams ? "Loading teams..." : selectedTeams.length > 0 ? `Selected ${selectedTeams.length} teams` : "Click to select teams"}
              </span>
              <ChevronDown size={20} className={`transition ${showTeamDropdown ? "rotate-180" : ""}`} />
            </button>

            {showTeamDropdown && !loadingTeams && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
                {allTeams.length > 0 ? (
                  allTeams.map(team => (
                    <label
                      key={team.id}
                      className="flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                    >
                      <Checkbox
                        checked={selectedTeams.some(t => t.id === team.id)}
                        onCheckedChange={() => handleTeamToggle(team)}
                      />
                      <span className="ml-3 text-sm text-gray-700">{team.name}</span>
                    </label>
                  ))
                ) : (
                  <div className="px-4 py-2 text-sm text-gray-500">No teams available</div>
                )}
              </div>
            )}
          </div>

          {/* Selected Teams Display */}
          {selectedTeams.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTeams.map(team => (
                <Badge key={team.id} variant="secondary" className="bg-blue-100 text-blue-800 flex items-center gap-1">
                  {team.name}
                  <X
                    size={14}
                    className="cursor-pointer hover:text-blue-600"
                    onClick={() => removeTeam(team.id)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Player Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">
            Select Players (Multi-select){selectedTeams.length === 0 && " - Select teams first"}
          </label>
          <div className="relative">
            <button
              onClick={() => selectedTeams.length > 0 && setShowPlayerDropdown(!showPlayerDropdown)}
              disabled={selectedTeams.length === 0 || loadingPlayers}
              className="w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex justify-between items-center"
            >
              <span className="text-gray-600">
                {loadingPlayers ? "Loading players..." : selectedPlayers.length > 0 ? `Selected ${selectedPlayers.length} players` : "Click to select players"}
              </span>
              <ChevronDown size={20} className={`transition ${showPlayerDropdown ? "rotate-180" : ""}`} />
            </button>

            {showPlayerDropdown && availablePlayers.length > 0 && !loadingPlayers && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
                {availablePlayers.map(player => {
                  const team = allTeams.find(t => t.id === player.teamId);
                  return (
                    <label
                      key={player.id}
                      className="flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                    >
                      <Checkbox
                        checked={selectedPlayers.some(p => p.id === player.id)}
                        onCheckedChange={() => handlePlayerToggle(player)}
                      />
                      <span className="ml-3 text-sm text-gray-700">
                        {player.name} ({player.position}) - {team?.name || "Unknown Team"}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Players Display */}
          {selectedPlayers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedPlayers.map(player => (
                <Badge key={player.id} variant="outline" className="bg-green-50 text-green-800 border-green-200 flex items-center gap-1">
                  {player.name}
                  <X
                    size={14}
                    className="cursor-pointer hover:text-green-600"
                    onClick={() => removePlayer(player.id)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        {(selectedTeams.length > 0 || selectedPlayers.length > 0) && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Analysis Scope:</span>
              {selectedTeams.length > 0 && ` ${selectedTeams.length} teams`}
              {selectedTeams.length > 0 && selectedPlayers.length > 0 && " | "}
              {selectedPlayers.length > 0 && `${selectedPlayers.length} players`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
