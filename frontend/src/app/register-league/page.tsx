"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTeams } from "@/api/teams";
import { signUpUser } from "@/api/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Button } from "@/app/components/ui/button";
import LogoButton from "../components/navbar/LogoButton";

interface Team {
  team_id: string;
  team_name: string;
}

export default function LeagueRegistrationPage() {
  const router = useRouter();
  const [basicInfo, setBasicInfo] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teamsData = await getTeams();
        setTeams(teamsData);
      } catch (error) {
        console.error("Error fetching teams:", error);
      }
    };

    fetchTeams();

    const stored = sessionStorage.getItem("leagueRegistration");
    if (!stored) {
      router.push("/register-account");
      return;
    }
    setBasicInfo(JSON.parse(stored));
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (!selectedTeam) {
      console.error("No team selected");
      return;
    }

    const userData = {
      ...basicInfo,
      role: "league",
      teamId: selectedTeam,
      teamRole: formData.get("team-role"),
    };
    try {
      await signUpUser(userData);
      sessionStorage.removeItem("leagueRegistration");
      router.push("/confirm");
    } catch (error) {
      console.error("Registration error:", error);
    }
  };

  if (!basicInfo) return null;

  return (
    <Card className="w-[450px] pb-5 px-5">
      <CardHeader className="flex flex-col items-center justify-center">
        <div className="mb-2">
          <LogoButton width={70} height={70} />
        </div>
        <CardTitle className="text-alpbBlue">
          Complete League Registration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="team-select">Select Team</Label>
              <Select
                onValueChange={(value) => {
                  setSelectedTeam(value);
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {teams.map((team) => (
                      <SelectItem key={team.team_id} value={team.team_id}>
                        {team.team_name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="team-role">Your Role</Label>
              <Input
                id="team-role"
                name="team-role"
                type="text"
                required={true}
                placeholder="e.g., General Manager, Analytics Director"
              />
            </div>
            <Button type="submit" className="w-full">
              Complete Registration
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
