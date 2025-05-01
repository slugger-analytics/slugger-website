import { $leagueLeaders } from "@/lib/widgetStore";
import { useStore } from "@nanostores/react";
import React, { useState, useEffect } from "react";
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

type StatLeadersProps = {
  setYear: React.Dispatch<React.SetStateAction<string>>;
};

const StatLeaders = ({ setYear }: StatLeadersProps) => {
  const { loadLeagueLeaders } = useQueryLeague();
  const [lastUpdated, setLastUpdated] = useState("");
  const [statView, setStatView] = useState("Batting");
  const allLeadersData = useStore($leagueLeaders);

  useEffect(() => {
    setYear(allLeadersData.year);
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
    loadLeagueLeaders();
  }, []);

  const batters = allLeadersData?.stats?.batting?.player ?? [];
  const pitchers = allLeadersData?.stats?.pitching?.player ?? [];

  return (
    <div className="flex flex-col items-center justify-center bg-white p-6 rounded-lg shadow-sm border mb-8 w-[50%] max-w-[calc(100%-2rem)] min-w-[360px]">
      <Tabs defaultValue="batting" className="w-full max-w-3xl">
        <TabsList className="mb-4 w-full flex justify-center">
          <TabsTrigger value="batting" onClick={() => setStatView("Batting")}>
            Batting Leaders
          </TabsTrigger>
          <TabsTrigger value="pitching" onClick={() => setStatView("Pitching")}>
            Pitching Leaders
          </TabsTrigger>
        </TabsList>
        <p className="text-xs text-gray-500 w-full text-center">{`Ranked by ${statView === "Batting" ? "Batting Average" : "ERA"}`}</p>

        <TabsContent value="batting">
          <Table>
            <TableHeader className="bg-alpbBlue text-white">
              <TableRow>
                <th className="p-2"></th>
                <th className="border border-gray-300 p-2">Player</th>
                <th className="border border-gray-300 p-2">Team</th>
                <th className="border border-gray-300 p-2">AVG</th>
                <th className="border border-gray-300 p-2">HR</th>
                <th className="border border-gray-300 p-2">RBI</th>
                <th className="border border-gray-300 p-2">SB</th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batters.map((batter, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{batter.playername}</TableCell>
                  <TableCell>{batter.teamname?.$t}</TableCell>
                  <TableCell>{batter.avg}</TableCell>
                  <TableCell>{batter.hr}</TableCell>
                  <TableCell>{batter.rbi}</TableCell>
                  <TableCell>{batter.sb}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="pitching">
          <Table>
            <TableHeader className="bg-alpbBlue text-white">
              <TableRow>
                <th className="p-2"></th>
                <th className="border border-gray-300 p-2">Player</th>
                <th className="border border-gray-300 p-2">Team</th>
                <th className="border border-gray-300 p-2">ERA</th>
                <th className="border border-gray-300 p-2">W</th>
                <th className="border border-gray-300 p-2">SO</th>
                <th className="border border-gray-300 p-2">IP</th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pitchers.map((pitcher, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{pitcher.playername}</TableCell>
                  <TableCell>{pitcher.teamname?.$t}</TableCell>
                  <TableCell>{pitcher.era}</TableCell>
                  <TableCell>{pitcher.wins}</TableCell>
                  <TableCell>{pitcher.so}</TableCell>
                  <TableCell>{pitcher.ip}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <p className="w-full text-center text-xs text-gray-500 mt-5">
        {lastUpdated ? `Last updated at ${lastUpdated}` : ""}
      </p>
    </div>
  );
};

export default StatLeaders;
