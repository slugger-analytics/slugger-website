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

type BattingSortKey = "rank" | "playername" | "teamname" | "g" | "pa" | "ab" | "runs" | "hits" | "bib" | "trib" | "hr" | "rbi" | "sb" | "dp" | "bb" | "so" | "avg" | "obp" | "slg" | "ops";
type PitchingSortKey = "rank" | "playername" | "teamname" | "games" | "gs" | "wins" | "losses" | "era" | "er" | "hits" | "bb" | "so" | "ip" | "whip" | "sv";
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
  }, [season, loadLeagueLeaders]);

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
      case "rank":       diff = leagueRankA - leagueRankB; break;
      case "playername": diff = a.playername.localeCompare(b.playername); break;
      case "teamname":   diff = (a.teamname?.fullname ?? "").localeCompare(b.teamname?.fullname ?? ""); break;
      case "g":          diff = parseInt(a.g ?? "0")    - parseInt(b.g ?? "0");    break;
      case "pa":         diff = parseInt(a.pa ?? "0")   - parseInt(b.pa ?? "0");   break;
      case "ab":         diff = parseInt(a.ab)           - parseInt(b.ab);           break;
      case "runs":       diff = parseInt(a.runs)         - parseInt(b.runs);         break;
      case "hits":       diff = parseInt(a.hits)         - parseInt(b.hits);         break;
      case "bib":        diff = parseInt(a.bib)          - parseInt(b.bib);          break;
      case "trib":       diff = parseInt(a.trib)         - parseInt(b.trib);         break;
      case "hr":         diff = parseInt(a.hr)           - parseInt(b.hr);           break;
      case "rbi":        diff = parseInt(a.rbi)          - parseInt(b.rbi);          break;
      case "sb":         diff = parseInt(a.sb)           - parseInt(b.sb);           break;
      case "dp":         diff = parseInt(a.dp)           - parseInt(b.dp);           break;
      case "bb":         diff = parseInt(a.bb)           - parseInt(b.bb);           break;
      case "so":         diff = parseInt(a.so)           - parseInt(b.so);           break;
      case "avg":        diff = parseFloat(a.avg)        - parseFloat(b.avg);        break;
      case "obp":        diff = parseFloat(a.obp)        - parseFloat(b.obp);        break;
      case "slg":        diff = parseFloat(a.slg)        - parseFloat(b.slg);        break;
      case "ops":        diff = parseFloat(a.ops ?? "0") - parseFloat(b.ops ?? "0"); break;
    }
    return dir === "asc" ? diff : -diff;
  });

  const sortedPitchers = [...pitchers].sort((a, b) => {
    const { key, dir } = pitchingSort;
    const leagueRankA = allPitchers.findIndex((x) => x.playerid === a.playerid);
    const leagueRankB = allPitchers.findIndex((x) => x.playerid === b.playerid);
    let diff = 0;
    switch (key) {
      case "rank":       diff = leagueRankA - leagueRankB; break;
      case "playername": diff = a.playername.localeCompare(b.playername); break;
      case "teamname":   diff = (a.teamname?.fullname ?? "").localeCompare(b.teamname?.fullname ?? ""); break;
      case "games":      diff = parseInt(a.games)          - parseInt(b.games);          break;
      case "gs":         diff = parseInt(a.gs)             - parseInt(b.gs);             break;
      case "wins":       diff = parseInt(a.wins)           - parseInt(b.wins);           break;
      case "losses":     diff = parseInt(a.losses)         - parseInt(b.losses);         break;
      case "era":        diff = parseFloat(a.era)          - parseFloat(b.era);          break;
      case "er":         diff = parseInt(a.er)             - parseInt(b.er);             break;
      case "hits":       diff = parseInt(a.hits)           - parseInt(b.hits);           break;
      case "bb":         diff = parseInt(a.bb)             - parseInt(b.bb);             break;
      case "so":         diff = parseInt(a.so)             - parseInt(b.so);             break;
      case "ip":         diff = parseFloat(a.ip)           - parseFloat(b.ip);           break;
      case "whip":       diff = parseFloat(a.whip ?? "0")  - parseFloat(b.whip ?? "0"); break;
      case "sv":         diff = parseInt(a.sv)             - parseInt(b.sv);             break;
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
        ["Rank", "Player", "Team", "G", "PA", "AB", "R", "H", "2B", "3B", "HR", "RBI", "SB", "DP", "BB", "SO", "BA", "OBP", "SLG", "OPS"],
        ...batters.map((b, i) => [
          String(i + 1), b.playername, b.teamname?.fullname ?? b.teamname?.$t ?? "",
          b.g ?? "", b.pa ?? "", b.ab, b.runs, b.hits, b.bib, b.trib, b.hr, b.rbi, b.sb, b.dp, b.bb, b.so, b.avg, b.obp, b.slg, b.ops ?? "",
        ]),
      ];
      downloadCsv(`${label}batting-leaders.csv`, rows);
    } else {
      const rows = [
        ["Rank", "Player", "Team", "GP", "GS", "W", "L", "ERA", "ER", "H", "BB", "SO", "IP", "WHIP", "SV"],
        ...pitchers.map((p, i) => [
          String(i + 1), p.playername, p.teamname?.fullname ?? p.teamname?.$t ?? "",
          p.games, p.gs, p.wins, p.losses, p.era, p.er, p.hits, p.bb, p.so, p.ip, p.whip ?? "", p.sv,
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
    hideOnMobile = false,
  ) => (
    <th
      className={`px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer select-none hover:text-gray-700 transition-colors whitespace-nowrap ${align}${hideOnMobile ? " hidden sm:table-cell" : ""}`}
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
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-5 pt-4 pb-3 border-b border-gray-100">
        <Tabs defaultValue="batting">
          <TabsList>
            <TabsTrigger value="batting" onClick={() => setStatView("Batting")}>Batting</TabsTrigger>
            <TabsTrigger value="pitching" onClick={() => setStatView("Pitching")}>Pitching</TabsTrigger>
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {colHead("#",      () => handleBattingSort("rank"),       battingSortIcon("rank"),       "text-center")}
                  {colHead("Player", () => handleBattingSort("playername"), battingSortIcon("playername"), "text-left")}
                  {!teamFilter && colHead("Team", () => handleBattingSort("teamname"), battingSortIcon("teamname"), "text-left", true)}
                  {colHead("G",   () => handleBattingSort("g"),    battingSortIcon("g"),    "text-right", true)}
                  {colHead("PA",  () => handleBattingSort("pa"),   battingSortIcon("pa"),   "text-right", true)}
                  {colHead("AB",  () => handleBattingSort("ab"),   battingSortIcon("ab"),   "text-right", true)}
                  {colHead("R",   () => handleBattingSort("runs"), battingSortIcon("runs"), "text-right", true)}
                  {colHead("H",   () => handleBattingSort("hits"), battingSortIcon("hits"), "text-right", true)}
                  {colHead("2B",  () => handleBattingSort("bib"),  battingSortIcon("bib"),  "text-right", true)}
                  {colHead("3B",  () => handleBattingSort("trib"), battingSortIcon("trib"), "text-right", true)}
                  {colHead("HR",  () => handleBattingSort("hr"),   battingSortIcon("hr"))}
                  {colHead("RBI", () => handleBattingSort("rbi"),  battingSortIcon("rbi"))}
                  {colHead("SB",  () => handleBattingSort("sb"),   battingSortIcon("sb"))}
                  {colHead("DP",  () => handleBattingSort("dp"),   battingSortIcon("dp"),   "text-right", true)}
                  {colHead("BB",  () => handleBattingSort("bb"),   battingSortIcon("bb"),   "text-right", true)}
                  {colHead("SO",  () => handleBattingSort("so"),   battingSortIcon("so"),   "text-right", true)}
                  {colHead("BA",  () => handleBattingSort("avg"),  battingSortIcon("avg"))}
                  {colHead("OBP", () => handleBattingSort("obp"),  battingSortIcon("obp"),  "text-right", true)}
                  {colHead("SLG", () => handleBattingSort("slg"),  battingSortIcon("slg"),  "text-right", true)}
                  {colHead("OPS", () => handleBattingSort("ops"),  battingSortIcon("ops"))}
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
                      <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{batter.playername}</td>
                      {!teamFilter && <td className="px-3 py-2.5 text-gray-500 text-sm hidden sm:table-cell whitespace-nowrap">{batter.teamname?.fullname ?? batter.teamname?.$t}</td>}
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 hidden sm:table-cell">{batter.g ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 hidden sm:table-cell">{batter.pa ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 hidden sm:table-cell">{batter.ab}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 hidden sm:table-cell">{batter.runs}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 hidden sm:table-cell">{batter.hits}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 hidden sm:table-cell">{batter.bib}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 hidden sm:table-cell">{batter.trib}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{batter.hr}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{batter.rbi}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{batter.sb}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 hidden sm:table-cell">{batter.dp}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 hidden sm:table-cell">{batter.bb}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 hidden sm:table-cell">{batter.so}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-800">{batter.avg}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 hidden sm:table-cell">{batter.obp}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 hidden sm:table-cell">{batter.slg}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-800">{batter.ops ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── pitching ── */}
      {statView === "Pitching" && (
        pitchers.length === 0 ? (
          <p className="italic text-sm text-gray-400 text-center py-10">No pitching data for this team.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {colHead("#",      () => handlePitchingSort("rank"),       pitchingSortIcon("rank"),       "text-center")}
                  {colHead("Player", () => handlePitchingSort("playername"), pitchingSortIcon("playername"), "text-left")}
                  {!teamFilter && colHead("Team", () => handlePitchingSort("teamname"), pitchingSortIcon("teamname"), "text-left", true)}
                  {colHead("GP",   () => handlePitchingSort("games"),  pitchingSortIcon("games"),  "text-right", true)}
                  {colHead("GS",   () => handlePitchingSort("gs"),     pitchingSortIcon("gs"),     "text-right", true)}
                  {colHead("W",    () => handlePitchingSort("wins"),   pitchingSortIcon("wins"))}
                  {colHead("L",    () => handlePitchingSort("losses"), pitchingSortIcon("losses"))}
                  {colHead("ERA",  () => handlePitchingSort("era"),    pitchingSortIcon("era"))}
                  {colHead("ER",   () => handlePitchingSort("er"),     pitchingSortIcon("er"),     "text-right", true)}
                  {colHead("H",    () => handlePitchingSort("hits"),   pitchingSortIcon("hits"),   "text-right", true)}
                  {colHead("BB",   () => handlePitchingSort("bb"),     pitchingSortIcon("bb"),     "text-right", true)}
                  {colHead("SO",   () => handlePitchingSort("so"),     pitchingSortIcon("so"))}
                  {colHead("IP",   () => handlePitchingSort("ip"),     pitchingSortIcon("ip"))}
                  {colHead("WHIP", () => handlePitchingSort("whip"),   pitchingSortIcon("whip"),   "text-right", true)}
                  {colHead("SV",   () => handlePitchingSort("sv"),     pitchingSortIcon("sv"),     "text-right", true)}
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
                      <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{pitcher.playername}</td>
                      {!teamFilter && <td className="px-3 py-2.5 text-gray-500 text-sm hidden sm:table-cell whitespace-nowrap">{pitcher.teamname?.fullname ?? pitcher.teamname?.$t}</td>}
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 hidden sm:table-cell">{pitcher.games}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 hidden sm:table-cell">{pitcher.gs}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{pitcher.wins}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{pitcher.losses}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-gray-800">{pitcher.era}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 hidden sm:table-cell">{pitcher.er}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 hidden sm:table-cell">{pitcher.hits}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 hidden sm:table-cell">{pitcher.bb}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{pitcher.so}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{pitcher.ip}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 hidden sm:table-cell">{pitcher.whip ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 hidden sm:table-cell">{pitcher.sv}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
