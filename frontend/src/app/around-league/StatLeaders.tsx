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
      <div className="flex items-center justify-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 w-full">
        <p className="text-gray-400 py-8 text-sm">Loading stat leaders…</p>
      </div>
    );
  }

  if (leadersError) {
    return (
      <div className="flex items-center justify-center bg-white p-6 rounded-xl shadow-sm border border-gray-100 w-full">
        <p className="text-gray-400 py-8 italic text-sm">Data unavailable for this season.</p>
      </div>
    );
  }

  const colHead = (
    label: string,
    onClick: () => void,
    icon: React.ReactNode,
    align = "text-right",
  ) => (
    <th
      className={`px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer select-none hover:text-gray-700 transition-colors whitespace-nowrap ${align}`}
      onClick={onClick}
    >
      <span className={`inline-flex items-center gap-0.5 ${align === "text-right" ? "justify-end" : ""}`}>
        {label} {icon}
      </span>
    </th>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 w-full overflow-hidden">
      {/* ── toolbar ── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
        <Tabs defaultValue="batting">
          <TabsList>
            <TabsTrigger value="batting" onClick={() => setStatView("Batting")}>Batting Leaders</TabsTrigger>
            <TabsTrigger value="pitching" onClick={() => setStatView("Pitching")}>Pitching Leaders</TabsTrigger>
          </TabsList>
        </Tabs>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-alpbBlue hover:border-alpbBlue border border-gray-200 rounded-md px-3 py-1.5 transition-colors"
        >
          <Download size={12} />
          Export CSV
        </button>
      </div>

      {/* ── batting ── */}
      {statView === "Batting" && (
        batters.length === 0 ? (
          <p className="italic text-sm text-gray-400 text-center py-10">No batting data for this team.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {colHead("#",      () => handleBattingSort("rank"),       battingSortIcon("rank"),       "text-center")}
                {colHead("Player", () => handleBattingSort("playername"), battingSortIcon("playername"), "text-left")}
                {!teamFilter && colHead("Team", () => handleBattingSort("teamname"), battingSortIcon("teamname"), "text-left")}
                {colHead("AVG",    () => handleBattingSort("avg"),        battingSortIcon("avg"))}
                {colHead("HR",     () => handleBattingSort("hr"),         battingSortIcon("hr"))}
                {colHead("RBI",    () => handleBattingSort("rbi"),        battingSortIcon("rbi"))}
                {colHead("SB",     () => handleBattingSort("sb"),         battingSortIcon("sb"))}
              </tr>
            </thead>
            <tbody>
              {sortedBatters.map((batter, index) => {
                const leagueRank = allBatters.findIndex((b) => b.playerid === batter.playerid) + 1;
                return (
                  <tr
                    key={batter.playerid}
                    className={`border-b border-gray-100 hover:bg-blue-50/40 transition-colors ${index % 2 === 1 ? "bg-gray-50" : "bg-white"}`}
                  >
                    <td className="px-3 py-2.5 text-center tabular-nums text-gray-500 text-sm w-10">
                      {leagueRank}{teamFilter && <span className="ml-0.5 text-[10px] text-gray-400">(lg)</span>}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{batter.playername}</td>
                    {!teamFilter && <td className="px-3 py-2.5 text-gray-500 text-sm">{batter.teamname?.fullname ?? batter.teamname?.$t}</td>}
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-800">{batter.avg}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{batter.hr}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{batter.rbi}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{batter.sb}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )
      )}

      {/* ── pitching ── */}
      {statView === "Pitching" && (
        pitchers.length === 0 ? (
          <p className="italic text-sm text-gray-400 text-center py-10">No pitching data for this team.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {colHead("#",      () => handlePitchingSort("rank"),       pitchingSortIcon("rank"),       "text-center")}
                {colHead("Player", () => handlePitchingSort("playername"), pitchingSortIcon("playername"), "text-left")}
                {!teamFilter && colHead("Team", () => handlePitchingSort("teamname"), pitchingSortIcon("teamname"), "text-left")}
                {colHead("ERA",    () => handlePitchingSort("era"),        pitchingSortIcon("era"))}
                {colHead("W",      () => handlePitchingSort("wins"),       pitchingSortIcon("wins"))}
                {colHead("SO",     () => handlePitchingSort("so"),         pitchingSortIcon("so"))}
                {colHead("IP",     () => handlePitchingSort("ip"),         pitchingSortIcon("ip"))}
              </tr>
            </thead>
            <tbody>
              {sortedPitchers.map((pitcher, index) => {
                const leagueRank = allPitchers.findIndex((p) => p.playerid === pitcher.playerid) + 1;
                return (
                  <tr
                    key={pitcher.playerid}
                    className={`border-b border-gray-100 hover:bg-blue-50/40 transition-colors ${index % 2 === 1 ? "bg-gray-50" : "bg-white"}`}
                  >
                    <td className="px-3 py-2.5 text-center tabular-nums text-gray-500 text-sm w-10">
                      {leagueRank}{teamFilter && <span className="ml-0.5 text-[10px] text-gray-400">(lg)</span>}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{pitcher.playername}</td>
                    {!teamFilter && <td className="px-3 py-2.5 text-gray-500 text-sm">{pitcher.teamname?.fullname ?? pitcher.teamname?.$t}</td>}
                    <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-800">{pitcher.era}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{pitcher.wins}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{pitcher.so}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{pitcher.ip}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )
      )}

      {lastUpdated && (
        <p className="text-right text-[11px] text-gray-400 px-5 py-2.5 border-t border-gray-100">
          Updated {lastUpdated}
        </p>
      )}
    </div>
  );
};

export default StatLeaders;
