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
import { UserPlus, Link as LinkIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { $user } from "@/lib/store";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type TeamMember = {
  user_id: number;
  first: string;
  last: string;
  email: string;
  is_admin: boolean;
  team_role: string;
  teamId: string;
  team_name: string;
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const user = useStore($user);


  const generateInviteLink = async () => {
    try {
      const response = await fetch(`${API_URL}/api/teams/${user.teamId}/invite`, {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        const link = `${window.location.origin}/register?invite=${data.token}`;
        setInviteLink(link);
        await navigator.clipboard.writeText(link);
        toast.success("Invite link copied to clipboard!");
      } else {
        toast.error("Failed to generate invite link");
      }
    } catch (error) {
      console.error("Error generating invite link:", error);
      toast.error("Failed to generate invite link");
    }
  };

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        console.log(user.team_id);
        const response = await fetch(`${API_URL}/api/teams/${user.team_id}/members`);
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

            <div className="mt-8 flex flex-col items-center gap-4">
              <Button 
                variant="outline"
                className="flex items-center gap-2"
                onClick={generateInviteLink}
              >
                <LinkIcon className="h-5 w-5" />
                Generate Invite Link
              </Button>
              {inviteLink && (
                <div className="text-sm text-gray-500 text-center">
                  <p>Share this link with your team members:</p>
                  <code className="bg-gray-100 px-2 py-1 rounded">{inviteLink}</code>
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
