import { $leagueLeaders } from "@/lib/widgetStore";
import { useStore } from "@nanostores/react";
import React, { useState, useEffect } from "react";
import { Download } from "lucide-react";
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
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";

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
            ? `${teamFilter} players · ranked by league ${statView === "Batting" ? "Batting Average" : "ERA"}`
            : `Ranked by ${statView === "Batting" ? "Batting Average" : "ERA"}`}
        </p>

        <TabsContent value="batting">
          {batters.length === 0 ? (
            <p className="text-center text-gray-400 italic py-6 text-sm">No batting data for this team.</p>
          ) : (
            <Table>
              <TableHeader className="bg-alpbBlue text-white">
                <TableRow>
                  <th className="p-2">#</th>
                  <th className="border border-gray-300 p-2">Player</th>
                  {!teamFilter && <th className="border border-gray-300 p-2">Team</th>}
                  <th className="border border-gray-300 p-2">AVG</th>
                  <th className="border border-gray-300 p-2">HR</th>
                  <th className="border border-gray-300 p-2">RBI</th>
                  <th className="border border-gray-300 p-2">SB</th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batters.map((batter, index) => {
                  const leagueRank = teamFilter
                    ? allBatters.findIndex((b) => b.playerid === batter.playerid) + 1
                    : index + 1;
                  return (
                    <TableRow key={index}>
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
                <TableRow>
                  <th className="p-2">#</th>
                  <th className="border border-gray-300 p-2">Player</th>
                  {!teamFilter && <th className="border border-gray-300 p-2">Team</th>}
                  <th className="border border-gray-300 p-2">ERA</th>
                  <th className="border border-gray-300 p-2">W</th>
                  <th className="border border-gray-300 p-2">SO</th>
                  <th className="border border-gray-300 p-2">IP</th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pitchers.map((pitcher, index) => {
                  const leagueRank = teamFilter
                    ? allPitchers.findIndex((p) => p.playerid === pitcher.playerid) + 1
                    : index + 1;
                  return (
                    <TableRow key={index}>
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
