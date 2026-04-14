import { $standings } from "@/lib/widgetStore";
import { useStore } from "@nanostores/react";
import React, { useState, useEffect } from "react";
import { ChevronsUpDown, ChevronUp, ChevronDown, Download } from "lucide-react";
import { Division, Team } from "@/data/types";
import useQueryLeague from "../hooks/use-query-league";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";

type SortKey = "teamname" | "wins" | "losses" | "pct" | "streak" | "last10";
type SortDir = "asc" | "desc";

function parseStreak(s: string): number {
  const m = s?.match(/^([WL])(\d+)$/);
  if (!m) return 0;
  return m[1] === "W" ? parseInt(m[2]) : -parseInt(m[2]);
}

function parseLast10Wins(s: string): number {
  return parseInt(s?.split("-")[0] ?? "0") || 0;
}

function sortTeams(teams: Team[], key: SortKey, dir: SortDir): Team[] {
  return [...teams].sort((a, b) => {
    let diff = 0;
    switch (key) {
      case "wins":     diff = parseInt(a.wins)    - parseInt(b.wins);    break;
      case "losses":   diff = parseInt(a.losses)  - parseInt(b.losses);  break;
      case "pct":      diff = parseFloat(a.pct)   - parseFloat(b.pct);   break;
      case "streak":   diff = parseStreak(a.streak) - parseStreak(b.streak); break;
      case "last10":   diff = parseLast10Wins(a.last10) - parseLast10Wins(b.last10); break;
      case "teamname": diff = a.teamname.localeCompare(b.teamname); break;
    }
    return dir === "asc" ? diff : -diff;
  });
}

/** Mini pip bar for Last 10 */
function PipBar({ value }: { value: string }) {
  const parts = value?.split("-");
  const wins = parseInt(parts?.[0] ?? "0") || 0;
  const losses = parseInt(parts?.[1] ?? "0") || 0;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="tabular-nums text-xs font-medium">{value}</span>
      <div className="flex gap-px">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className={`inline-block w-2 h-2 rounded-sm ${i < wins ? "bg-alpbBlue" : "bg-gray-200"}`}
          />
        ))}
      </div>
      <span className="text-[9px] text-gray-400 tabular-nums">{wins}W·{losses}L</span>
    </div>
  );
}

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

type AroundLeagueProps = {
  season: string;
  maxTeams?: number;
  compact?: boolean;
  teamFilter?: string;
};

const Standings = ({ season, maxTeams, compact, teamFilter }: AroundLeagueProps) => {
  const { loadStandings, standingsLoading, standingsError } = useQueryLeague();

  const [standingsData, setStandingsData] = useState<Division[]>([]);
  const [view, setView] = useState("OVERALL");
  const [lastUpdated, setLastUpdated] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("pct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const allStandingsData = useStore($standings);

  useEffect(() => {
    if (allStandingsData?.standings?.conference) {
      const data = allStandingsData.standings.conference.find(
        (conf) => conf.name === view,
      );
      const divisions = data?.division.map((division) => ({
        ...division,
        team: [...division.team],
      })) ?? [];
      setStandingsData(divisions);
      const readableDate = new Date(allStandingsData.updatedAt).toLocaleString("en-US", {
        year: "numeric", month: "long", day: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true,
      });
      setLastUpdated(readableDate);
    }
  }, [allStandingsData, view]);

  useEffect(() => {
    loadStandings(season || undefined);
  }, [season]);

  const handleExport = () => {
    const header = ["Division", "Team", "W", "L", "PCT", "Streak", "Last 10"];
    const rows: string[][] = [header];
    standingsData.forEach((division) => {
      sortTeams(division.team, sortKey, sortDir).forEach((team) => {
        rows.push([division.name, team.teamname, team.wins, team.losses, team.pct, team.streak, team.last10]);
      });
    });
    downloadCsv(`${season ? `${season}-` : ""}standings.csv`, rows);
  };

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "losses" || key === "teamname" ? "asc" : "desc");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (key !== sortKey) return <ChevronsUpDown className="opacity-30 shrink-0" size={11} />;
    return sortDir === "asc"
      ? <ChevronUp className="shrink-0" size={11} />
      : <ChevronDown className="shrink-0" size={11} />;
  };

  const colHead = (key: SortKey, label: string, align = "text-right") =>
    compact ? (
      <th key={key} className={`px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 ${align}`}>
        {label}
      </th>
    ) : (
      <th
        key={key}
        className={`px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer select-none hover:text-gray-700 transition-colors whitespace-nowrap ${align}`}
        onClick={() => handleSort(key)}
      >
        <span className="inline-flex items-center gap-0.5 justify-end">
          {label} {sortIcon(key)}
        </span>
      </th>
    );

  if (standingsLoading) {
    return (
      <div className={`${compact ? "" : "bg-white rounded-xl shadow-sm border border-gray-100 p-6"}`}>
        <div className="space-y-2 py-4">
          {[1,2,3,4].map(i => <div key={i} className="h-8 rounded bg-gray-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (standingsError) {
    return (
      <div className={`${compact ? "" : "bg-white rounded-xl shadow-sm border border-gray-100 p-6"}`}>
        <p className="text-gray-400 italic text-sm py-6 text-center">Data unavailable for this season.</p>
      </div>
    );
  }

  // Build flat list of {division, teams} respecting filters
  const sections = standingsData
    .map((division) => {
      const base = maxTeams ? division.team.slice(0, maxTeams) : division.team;
      const filtered = teamFilter ? base.filter((t) => t.teamname === teamFilter) : base;
      const teams = sortTeams(filtered, sortKey, sortDir);
      return { division, teams };
    })
    .filter(({ teams }) => teams.length > 0);

  return (
    <div className={`${compact ? "" : "bg-white rounded-xl shadow-sm border border-gray-100 w-full overflow-hidden"}`}>
      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-y-2 px-5 pt-4 pb-3 border-b border-gray-100">
          <Tabs defaultValue="OVERALL">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="OVERALL" onClick={() => setView("OVERALL")}>Overall</TabsTrigger>
              <TabsTrigger value="FIRST HALF" onClick={() => setView("FIRST HALF")}>1st Half</TabsTrigger>
              <TabsTrigger value="SECOND HALF" onClick={() => setView("SECOND HALF")}>2nd Half</TabsTrigger>
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
      )}

      <table className="w-full border-collapse text-sm">
        {/* Column headers */}
        <thead>
          <tr className="border-b border-gray-100">
            {compact ? (
              <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-left">Team</th>
            ) : (
              <th
                className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-left cursor-pointer select-none hover:text-gray-700 transition-colors"
                onClick={() => handleSort("teamname")}
              >
                <span className="inline-flex items-center gap-0.5">Team {sortIcon("teamname")}</span>
              </th>
            )}
            {colHead("wins",    "W")}
            {colHead("losses",  "L")}
            {colHead("pct",     "PCT")}
            <th className={`px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer select-none hover:text-gray-700 transition-colors whitespace-nowrap text-right hidden sm:table-cell`} onClick={() => handleSort("streak")}>
              <span className="inline-flex items-center gap-0.5 justify-end">STRK {sortIcon("streak")}</span>
            </th>
            <th className={`px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 cursor-pointer select-none hover:text-gray-700 transition-colors whitespace-nowrap text-center hidden sm:table-cell`} onClick={() => handleSort("last10")}>
              <span className="inline-flex items-center gap-0.5">L10 {sortIcon("last10")}</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {sections.map(({ division, teams }) => (
            <React.Fragment key={division.name}>
              {/* Division label row */}
              {!compact && !teamFilter && (
                <tr className="bg-gray-50 border-b border-gray-100">
                  <td
                    colSpan={6}
                    className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400"
                  >
                    {division.name}
                  </td>
                </tr>
              )}
              {teams.map((team, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-gray-100 transition-colors hover:bg-blue-50/40 ${
                    teamFilter && team.teamname === teamFilter ? "bg-alpbBlue/5" : ""
                  }`}
                >
                  <td className={`${compact ? "px-2 py-2" : "px-4 py-3"} font-medium text-gray-800`}>
                    {team.teamname}
                  </td>
                  <td className={`${compact ? "px-2 py-2 text-xs" : "px-3 py-3"} text-right tabular-nums text-gray-700`}>
                    {team.wins}
                  </td>
                  <td className={`${compact ? "px-2 py-2 text-xs" : "px-3 py-3"} text-right tabular-nums text-gray-700`}>
                    {team.losses}
                  </td>
                  <td className={`${compact ? "px-2 py-2 text-xs" : "px-3 py-3"} text-right tabular-nums font-semibold text-gray-800`}>
                    {team.pct}
                  </td>
                  <td className={`${compact ? "px-2 py-2 text-xs" : "px-3 py-3"} text-right tabular-nums text-gray-600 hidden sm:table-cell`}>
                    {team.streak}
                  </td>
                  <td className={`${compact ? "px-2 py-2" : "px-3 py-3"} text-center hidden sm:table-cell`}>
                    {!compact && team.last10
                      ? <PipBar value={team.last10} />
                      : <span className="tabular-nums text-xs text-gray-600">{team.last10}</span>
                    }
                  </td>
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {!compact && lastUpdated && (
        <p className="text-right text-[11px] text-gray-400 px-5 py-2.5 border-t border-gray-100">
          Updated {lastUpdated}
        </p>
      )}
    </div>
  );
};

export default Standings;
