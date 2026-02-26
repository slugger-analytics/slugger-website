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
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";

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
      case "wins":    diff = parseInt(a.wins)    - parseInt(b.wins);    break;
      case "losses":  diff = parseInt(a.losses)  - parseInt(b.losses);  break;
      case "pct":     diff = parseFloat(a.pct)   - parseFloat(b.pct);   break;
      case "streak":  diff = parseStreak(a.streak) - parseStreak(b.streak); break;
      case "last10":  diff = parseLast10Wins(a.last10) - parseLast10Wins(b.last10); break;
      case "teamname":
        diff = a.teamname.localeCompare(b.teamname);
        break;
    }
    return dir === "asc" ? diff : -diff;
  });
}

function Last10Cell({ value, compact }: { value: string; compact: boolean }) {
  const parts = value?.split("-");
  const wins = parseInt(parts?.[0] ?? "0") || 0;
  const losses = parseInt(parts?.[1] ?? "0") || 0;
  const total = wins + losses;

  return (
    <TableCell
      className={`border border-gray-300 ${compact ? "p-1" : "p-2"}`}
    >
      {!compact && value ? (
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm">{value}</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <span
                key={i}
                className={`inline-block w-3 h-3 rounded-sm ${
                  i < wins ? "bg-gray-700" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">{wins} W · {losses} L</span>
        </div>
      ) : (
        value
      )}
    </TableCell>
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
      // Store raw order — sorting is applied at render time
      const divisions = data?.division.map((division) => ({
        ...division,
        team: [...division.team],
      })) ?? [];

      setStandingsData(divisions);
      const readableDate = new Date(allStandingsData.updatedAt).toLocaleString(
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
        rows.push([
          division.name,
          team.teamname,
          team.wins,
          team.losses,
          team.pct,
          team.streak,
          team.last10,
        ]);
      });
    });
    const label = season ? `${season}-` : "";
    downloadCsv(`${label}standings.csv`, rows);
  };

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Sensible defaults: fewest losses → asc; everything else → desc
      setSortDir(key === "losses" || key === "teamname" ? "asc" : "desc");
    }
  };

  const sortIndicator = (key: SortKey) => {
    if (key !== sortKey)
      return <ChevronsUpDown className="ml-1 opacity-30 shrink-0" size={13} />;
    return sortDir === "asc"
      ? <ChevronUp className="ml-1 shrink-0" size={13} />
      : <ChevronDown className="ml-1 shrink-0" size={13} />;
  };

  const SortableTh = ({
    colKey,
    children,
    className = "",
  }: {
    colKey: SortKey;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th
      className={`border border-gray-300 p-2 cursor-pointer select-none hover:bg-alpbBlue/80 transition-colors ${className}`}
      onClick={() => handleSort(colKey)}
    >
      <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
        {children}
        {sortIndicator(colKey)}
      </span>
    </th>
  );

  if (standingsLoading) {
    return (
      <div className={`flex items-center justify-center rounded-lg ${compact ? "" : "p-6 bg-white shadow-sm border mb-8 w-[50%]"}`}>
        <p className="text-gray-500 py-8">Loading standings…</p>
      </div>
    );
  }

  if (standingsError) {
    return (
      <div className={`flex items-center justify-center rounded-lg ${compact ? "" : "p-6 bg-white shadow-sm border mb-8 w-[50%]"}`}>
        <p className="text-gray-500 py-8 italic">Data unavailable for this season.</p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg ${
        compact ? "p-0 mb-0 bg-transparent shadow-none border-none" : "p-6 bg-white shadow-sm border mb-8 w-[50%]"
      }`}
    >
      {!compact && (
        <div className="w-full flex items-center justify-between mb-5">
          <Tabs
            defaultValue="OVERALL"
            className="flex justify-center"
          >
            <TabsList>
              <TabsTrigger value="OVERALL" onClick={() => setView("OVERALL")}>
                Overall
              </TabsTrigger>
              <TabsTrigger value="FIRST HALF" onClick={() => setView("FIRST HALF")}>
                First Half
              </TabsTrigger>
              <TabsTrigger
                value="SECOND HALF"
                onClick={() => setView("SECOND HALF")}
              >
                Second Half
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-400 rounded-md px-3 py-1.5 transition-colors"
            title="Export standings as CSV"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>
      )}
      <div>
        {standingsData.map((division) => {
          const baseTeams = maxTeams ? division.team.slice(0, maxTeams) : division.team;
          const filtered = teamFilter
            ? baseTeams.filter((t) => t.teamname === teamFilter)
            : baseTeams;
          const teams = sortTeams(filtered, sortKey, sortDir);

          // Hide the whole division when no teams match the filter
          if (teams.length === 0) return null;

          return (
            <div key={division.name} className="mb-5">
              <Table>
                <TableHeader className="bg-alpbBlue text-white">
                  <TableRow className="hover:bg-transparent">
                    {compact ? (
                      <th className="border border-gray-300 p-2">{division.name}</th>
                    ) : (
                      <SortableTh colKey="teamname">{division.name}</SortableTh>
                    )}
                    <SortableTh colKey="wins">W</SortableTh>
                    <SortableTh colKey="losses">L</SortableTh>
                    <SortableTh colKey="pct">PCT</SortableTh>
                    <SortableTh colKey="streak">Streak</SortableTh>
                    <SortableTh colKey="last10">Last 10</SortableTh>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map((team, index) => (
                    <TableRow
                      key={index}
                      className={`hover:bg-transparent ${teamFilter && team.teamname === teamFilter ? "bg-alpbBlue/5 font-medium" : ""}`}
                    >
                      <TableCell className={`border border-gray-300 ${compact ? "p-1" : "p-2"}`}>
                        {team.teamname}
                      </TableCell>
                      <TableCell className={`border border-gray-300 ${compact ? "p-1" : "p-2"}`}>
                        {team.wins}
                      </TableCell>
                      <TableCell className={`border border-gray-300 ${compact ? "p-1" : "p-2"}`}>
                        {team.losses}
                      </TableCell>
                      <TableCell className={`border border-gray-300 ${compact ? "p-1" : "p-2"}`}>
                        {team.pct}
                      </TableCell>
                      <TableCell className={`border border-gray-300 ${compact ? "p-1" : "p-2"}`}>
                        {team.streak}
                      </TableCell>
                      <Last10Cell value={team.last10} compact={!!compact} />
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          );
        })}
        <p className="w-full text-center text-xs text-gray-500 mt-5">
          {lastUpdated ? `Last updated at ${lastUpdated}` : ""}
        </p>
      </div>
    </div>
  );
};

export default Standings;
