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
import {
  UserPlus,
  Link as LinkIcon,
  Clipboard as ClipboardIcon,
} from "lucide-react";
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

  console.log(user);

  const generateInviteLink = async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/teams/${user.teamId}/invite`,
        {
          method: "POST",
        },
      );
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
        console.log("TeamID");
        console.log(user.teamId);
        const response = await fetch(
          `${API_URL}/api/teams/${user.teamId}/members`,
        );
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

    if (user.teamId) {
      fetchTeamMembers();
    }
  }, [user.teamId]);

  return (
    <ProtectedRoute role="league">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SidebarTrigger />
          <div className="container mx-auto p-8">
            <h1 className="text-2xl font-bold text-center mb-8">
              Team Members
            </h1>

            {status && (
              <p className="text-center text-red-600 mb-4">{status}</p>
            )}

            <div className="max-w-2xl mx-auto grid gap-4">
              {members.length === 0 ? (
                <p className="text-center text-gray-600">
                  No team members found.
                </p>
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
                        {member.team_role}
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
                <Card className="w-full max-w-2xl">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center gap-4">
                      <p className="text-sm font-medium text-gray-600">
                        Your invite link:
                      </p>
                      <div className="w-full p-3 bg-gray-50 rounded-lg border border-gray-200 break-all text-sm font-mono text-gray-700">
                        {inviteLink}
                      </div>
                      <Button
                        variant="secondary"
                        className="flex items-center gap-2"
                        onClick={async () => {
                          await navigator.clipboard.writeText(inviteLink);
                          toast.success("Invite link copied to clipboard!");
                        }}
                      >
                        <ClipboardIcon className="h-5 w-5" />
                        Copy to Clipboard
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
