"use client";

import { AppSidebar } from "@/app/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/app/components/ui/sidebar";
import ProtectedRoute from "../components/ProtectedRoutes";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { $user } from "@/lib/store";

type TeamMember = {
  user_id: number;
  first: string;
  last: string;
  email: string;
  is_admin: boolean;
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const user = useStore($user);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const response = await fetch(`/api/teams/${user.team_id}/members`);
        const data = await response.json();
        
        if (data.success) {
          setMembers(data.data);
        } else {
          setStatus("Error loading team members");
        }
      } catch (error) {
        console.error("Error fetching team members:", error);
        setStatus("Error loading team members");
      }
    };

    if (user.team_id) {
      fetchTeamMembers();
    }
  }, [user.team_id]);

  return (
    <ProtectedRoute role="league">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SidebarTrigger />
          <div className="container mx-auto p-8">
            <h1 className="text-2xl font-bold text-center mb-8">Team Members</h1>

            {status && (
              <p className="text-center text-red-600 mb-4">{status}</p>
            )}

            <div className="max-w-2xl mx-auto grid gap-4">
              {members.length === 0 ? (
                <p className="text-center text-gray-600">No team members found.</p>
              ) : (
                members.map((member) => (
                  <Card key={member.user_id}>
                    <CardContent className="flex justify-between items-center p-6">
                      <div>
                        <h3 className="font-semibold">
                          {member.first} {member.last}
                        </h3>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                      <span className="text-sm bg-gray-100 px-3 py-1 rounded-full">
                        {member.is_admin ? "Admin" : "Member"}
                      </span>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="mt-8 flex justify-center">
              <Button className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add Team Member
              </Button>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
