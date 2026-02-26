import { $leagueLeaders } from "@/lib/widgetStore";
import { useStore } from "@nanostores/react";
import React, { useState, useEffect } from "react";
import { Download, ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react";
import useQueryLeague from "../hooks/use-query-league";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";

type BattingSortKey = "rank" | "playername" | "teamname" | "avg" | "hr" | "rbi" | "sb";
type PitchingSortKey = "rank" | "playername" | "teamname" | "era" | "wins" | "so" | "ip";
type SortDir = "asc" | "desc";

function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type StatLeadersProps = {
  season: string;
  teamFilter?: string;
};

const StatLeaders = ({ season, teamFilter }: StatLeadersProps) => {
  const { loadLeagueLeaders, leadersLoading, leadersError } = useQueryLeague();
  const [lastUpdated, setLastUpdated] = useState("");
  const [statView, setStatView] = useState("Batting");
  const [battingSort, setBattingSort] = useState<{ key: BattingSortKey; dir: SortDir }>({ key: "rank", dir: "asc" });
  const [pitchingSort, setPitchingSort] = useState<{ key: PitchingSortKey; dir: SortDir }>({ key: "rank", dir: "asc" });
  const allLeadersData = useStore($leagueLeaders);

  useEffect(() => {
    const readableDate = new Date(allLeadersData.updatedAt).toLocaleString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      },
    );
    setLastUpdated(readableDate);
  }, [allLeadersData]);

  useEffect(() => {
    loadLeagueLeaders(season || undefined);
  }, [season]);

  const allBatters = allLeadersData?.stats?.batting?.player ?? [];
  const allPitchers = allLeadersData?.stats?.pitching?.player ?? [];

  const batters = teamFilter
    ? allBatters.filter((b) => b.teamname?.fullname === teamFilter)
    : allBatters;
  const pitchers = teamFilter
    ? allPitchers.filter((p) => p.teamname?.fullname === teamFilter)
    : allPitchers;

  const handleBattingSort = (key: BattingSortKey) => {
    setBattingSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "playername" || key === "teamname" ? "asc" : "desc" },
    );
  };
  const handlePitchingSort = (key: PitchingSortKey) => {
    setPitchingSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "playername" || key === "teamname" ? "asc" : "desc" },
    );
  };

  const sortedBatters = [...batters].sort((a, b) => {
    const { key, dir } = battingSort;
    const leagueRankA = allBatters.findIndex((x) => x.playerid === a.playerid);
    const leagueRankB = allBatters.findIndex((x) => x.playerid === b.playerid);
    let diff = 0;
    switch (key) {
      case "rank":      diff = leagueRankA - leagueRankB; break;
      case "playername": diff = a.playername.localeCompare(b.playername); break;
      case "teamname":  diff = (a.teamname?.fullname ?? "").localeCompare(b.teamname?.fullname ?? ""); break;
      case "avg":       diff = parseFloat(a.avg) - parseFloat(b.avg); break;
      case "hr":        diff = parseInt(a.hr)    - parseInt(b.hr);    break;
      case "rbi":       diff = parseInt(a.rbi)   - parseInt(b.rbi);   break;
      case "sb":        diff = parseInt(a.sb)    - parseInt(b.sb);    break;
    }
    return dir === "asc" ? diff : -diff;
  });

  const sortedPitchers = [...pitchers].sort((a, b) => {
    const { key, dir } = pitchingSort;
    const leagueRankA = allPitchers.findIndex((x) => x.playerid === a.playerid);
    const leagueRankB = allPitchers.findIndex((x) => x.playerid === b.playerid);
    let diff = 0;
    switch (key) {
      case "rank":      diff = leagueRankA - leagueRankB; break;
      case "playername": diff = a.playername.localeCompare(b.playername); break;
      case "teamname":  diff = (a.teamname?.fullname ?? "").localeCompare(b.teamname?.fullname ?? ""); break;
      case "era":       diff = parseFloat(a.era)  - parseFloat(b.era);  break;
      case "wins":      diff = parseInt(a.wins)   - parseInt(b.wins);   break;
      case "so":        diff = parseInt(a.so)     - parseInt(b.so);     break;
      case "ip":        diff = parseFloat(a.ip)   - parseFloat(b.ip);   break;
    }
    return dir === "asc" ? diff : -diff;
  });

  const battingSortIcon = (key: BattingSortKey) =>
    key !== battingSort.key ? <ChevronsUpDown className="ml-1 opacity-30 shrink-0" size={13} /> :
    battingSort.dir === "asc" ? <ChevronUp className="ml-1 shrink-0" size={13} /> :
    <ChevronDown className="ml-1 shrink-0" size={13} />;

  const pitchingSortIcon = (key: PitchingSortKey) =>
    key !== pitchingSort.key ? <ChevronsUpDown className="ml-1 opacity-30 shrink-0" size={13} /> :
    pitchingSort.dir === "asc" ? <ChevronUp className="ml-1 shrink-0" size={13} /> :
    <ChevronDown className="ml-1 shrink-0" size={13} />;

  const thClass = "border border-gray-300 p-2 cursor-pointer select-none hover:bg-alpbBlue/80 transition-colors";

  const handleExport = () => {
    const label = season ? `${season}-` : "";
    if (statView === "Batting") {
      const rows = [
        ["Rank", "Player", "Team", "AVG", "HR", "RBI", "SB"],
        ...batters.map((b, i) => [
          String(i + 1),
          b.playername,
          b.teamname?.fullname ?? b.teamname?.$t ?? "",
          b.avg,
          b.hr,
          b.rbi,
          b.sb,
        ]),
      ];
      downloadCsv(`${label}batting-leaders.csv`, rows);
    } else {
      const rows = [
        ["Rank", "Player", "Team", "ERA", "W", "SO", "IP"],
        ...pitchers.map((p, i) => [
          String(i + 1),
          p.playername,
          p.teamname?.fullname ?? p.teamname?.$t ?? "",
          p.era,
          p.wins,
          p.so,
          p.ip,
        ]),
      ];
      downloadCsv(`${label}pitching-leaders.csv`, rows);
    }
  };

  if (leadersLoading) {
    return (
      <div className="flex items-center justify-center bg-white p-6 rounded-lg shadow-sm border mb-8 w-[50%] max-w-[calc(100%-2rem)] min-w-[360px]">
        <p className="text-gray-500 py-8">Loading stat leaders…</p>
      </div>
    );
  }

  if (leadersError) {
    return (
      <div className="flex items-center justify-center bg-white p-6 rounded-lg shadow-sm border mb-8 w-[50%] max-w-[calc(100%-2rem)] min-w-[360px]">
        <p className="text-gray-500 py-8 italic">Data unavailable for this season.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center bg-white p-6 rounded-lg shadow-sm border mb-8 w-[50%] max-w-[calc(100%-2rem)] min-w-[360px]">
      <Tabs defaultValue="batting" className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="batting" onClick={() => setStatView("Batting")}>
              Batting Leaders
            </TabsTrigger>
            <TabsTrigger value="pitching" onClick={() => setStatView("Pitching")}>
              Pitching Leaders
            </TabsTrigger>
          </TabsList>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-400 rounded-md px-3 py-1.5 transition-colors"
            title={`Export ${statView} leaders as CSV`}
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
        <p className="text-xs text-gray-500 w-full text-center">
          {teamFilter
            ? `${teamFilter} players · click any column to sort`
            : `Click any column header to sort`}
        </p>

        <TabsContent value="batting">
          {batters.length === 0 ? (
            <p className="text-center text-gray-400 italic py-6 text-sm">No batting data for this team.</p>
          ) : (
            <Table>
              <TableHeader className="bg-alpbBlue text-white">
                <TableRow className="hover:bg-transparent">
                  <th className={thClass} onClick={() => handleBattingSort("rank")}>
                    <span className="inline-flex items-center"># {battingSortIcon("rank")}</span>
                  </th>
                  <th className={thClass} onClick={() => handleBattingSort("playername")}>
                    <span className="inline-flex items-center">Player {battingSortIcon("playername")}</span>
                  </th>
                  {!teamFilter && (
                    <th className={thClass} onClick={() => handleBattingSort("teamname")}>
                      <span className="inline-flex items-center">Team {battingSortIcon("teamname")}</span>
                    </th>
                  )}
                  <th className={thClass} onClick={() => handleBattingSort("avg")}>
                    <span className="inline-flex items-center">AVG {battingSortIcon("avg")}</span>
                  </th>
                  <th className={thClass} onClick={() => handleBattingSort("hr")}>
                    <span className="inline-flex items-center">HR {battingSortIcon("hr")}</span>
                  </th>
                  <th className={thClass} onClick={() => handleBattingSort("rbi")}>
                    <span className="inline-flex items-center">RBI {battingSortIcon("rbi")}</span>
                  </th>
                  <th className={thClass} onClick={() => handleBattingSort("sb")}>
                    <span className="inline-flex items-center">SB {battingSortIcon("sb")}</span>
                  </th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBatters.map((batter, index) => {
                  const leagueRank = allBatters.findIndex((b) => b.playerid === batter.playerid) + 1;
                  return (
                    <TableRow key={batter.playerid} className="hover:bg-transparent">
                      <TableCell className="text-center">
                        {leagueRank}
                        {teamFilter && <span className="ml-1 text-xs text-gray-400">(lg)</span>}
                      </TableCell>
                      <TableCell>{batter.playername}</TableCell>
                      {!teamFilter && <TableCell>{batter.teamname?.fullname ?? batter.teamname?.$t}</TableCell>}
                      <TableCell>{batter.avg}</TableCell>
                      <TableCell>{batter.hr}</TableCell>
                      <TableCell>{batter.rbi}</TableCell>
                      <TableCell>{batter.sb}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="pitching">
          {pitchers.length === 0 ? (
            <p className="text-center text-gray-400 italic py-6 text-sm">No pitching data for this team.</p>
          ) : (
            <Table>
              <TableHeader className="bg-alpbBlue text-white">
                <TableRow className="hover:bg-transparent">
                  <th className={thClass} onClick={() => handlePitchingSort("rank")}>
                    <span className="inline-flex items-center"># {pitchingSortIcon("rank")}</span>
                  </th>
                  <th className={thClass} onClick={() => handlePitchingSort("playername")}>
                    <span className="inline-flex items-center">Player {pitchingSortIcon("playername")}</span>
                  </th>
                  {!teamFilter && (
                    <th className={thClass} onClick={() => handlePitchingSort("teamname")}>
                      <span className="inline-flex items-center">Team {pitchingSortIcon("teamname")}</span>
                    </th>
                  )}
                  <th className={thClass} onClick={() => handlePitchingSort("era")}>
                    <span className="inline-flex items-center">ERA {pitchingSortIcon("era")}</span>
                  </th>
                  <th className={thClass} onClick={() => handlePitchingSort("wins")}>
                    <span className="inline-flex items-center">W {pitchingSortIcon("wins")}</span>
                  </th>
                  <th className={thClass} onClick={() => handlePitchingSort("so")}>
                    <span className="inline-flex items-center">SO {pitchingSortIcon("so")}</span>
                  </th>
                  <th className={thClass} onClick={() => handlePitchingSort("ip")}>
                    <span className="inline-flex items-center">IP {pitchingSortIcon("ip")}</span>
                  </th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPitchers.map((pitcher, index) => {
                  const leagueRank = allPitchers.findIndex((p) => p.playerid === pitcher.playerid) + 1;
                  return (
                    <TableRow key={pitcher.playerid} className="hover:bg-transparent">
                      <TableCell className="text-center">
                        {leagueRank}
                        {teamFilter && <span className="ml-1 text-xs text-gray-400">(lg)</span>}
                      </TableCell>
                      <TableCell>{pitcher.playername}</TableCell>
                      {!teamFilter && <TableCell>{pitcher.teamname?.fullname ?? pitcher.teamname?.$t}</TableCell>}
                      <TableCell>{pitcher.era}</TableCell>
                      <TableCell>{pitcher.wins}</TableCell>
                      <TableCell>{pitcher.so}</TableCell>
                      <TableCell>{pitcher.ip}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      <p className="w-full text-center text-xs text-gray-500 mt-5">
        {lastUpdated ? `Last updated at ${lastUpdated}` : ""}
      </p>
    </div>
  );
};

export default StatLeaders;
