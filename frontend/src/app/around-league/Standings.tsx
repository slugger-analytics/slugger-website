import { $standings } from "@/lib/widgetStore";
import { useStore } from "@nanostores/react";
import React, { useState, useEffect } from "react";
import { Team, Division } from "@/data/types";
import useQueryLeague from "../hooks/use-query-league";
import { Card } from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";

type AroundLeagueProps = {
  setYear: React.Dispatch<React.SetStateAction<string>>;
  maxTeams?: number;
  compact?: boolean;
};

const Standings = ({ setYear, maxTeams, compact }: AroundLeagueProps) => {
  const { loadStandings } = useQueryLeague();

  const [standingsData, setStandingsData] = useState<Division[]>([]);
  const [view, setView] = useState("OVERALL");
  const [lastUpdated, setLastUpdated] = useState("");
  const allStandingsData = useStore($standings);

  useEffect(() => {
    if (allStandingsData?.standings?.conference) {
      const data = allStandingsData.standings.conference.find(
        (conf) => conf.name === view,
      );
      const sortedDivisions =
        data?.division.map((division) => ({
          ...division,
          team: [...division.team].sort(
            (a, b) => parseFloat(b.pct) - parseFloat(a.pct),
          ),
        })) ?? [];

      setStandingsData(sortedDivisions);
      setYear(allStandingsData.year);
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
    loadStandings();
  }, []);

  return (
<div
  className={`flex flex-col items-center justify-center rounded-lg ${
    compact ? "p-0 mb-0 bg-transparent shadow-none border-none" : "p-6 bg-white shadow-sm border mb-8 w-[50%]"
  }`}
>
  {!compact && (
      <Tabs
        defaultValue="OVERALL"
        className="w-[400px] flex justify-center mb-5"
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
  )}
      <div>
        {standingsData.map((division) => (
          <div key={division.name} className="mb-5">
            <Table className="">
              <TableHeader className="bg-alpbBlue text-white">
                <TableRow>
                  <th className="border border-gray-300 p-2">
                    {division.name}
                  </th>
                  <th className="border border-gray-300 p-2">W</th>
                  <th className="border border-gray-300 p-2">L</th>
                  <th className="border border-gray-300 p-2">PCT</th>
                  <th className="border border-gray-300 p-2">Streak</th>
                  <th className="border border-gray-300 p-2">Last 10</th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(maxTeams ? division.team.slice(0, maxTeams) : division.team).map(
                  (team, index) => (
                    <TableRow key={index} className="">
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
                      <TableCell className={`border border-gray-300 ${compact ? "p-1" : "p-2"}`}>
                        {team.last10}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>

            </Table>
          </div>
        ))}
        <p className="w-full text-center text-xs text-gray-500 mt-5">{`${lastUpdated ? "Last updated at " + lastUpdated : ""}`}</p>
      </div>
    </div>
  );
};

export default Standings;
