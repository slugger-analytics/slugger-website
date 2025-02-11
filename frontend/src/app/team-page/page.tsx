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
import {
  getTeamMembers,
  promoteTeamMember,
  removeTeamMember,
  getTeam,
} from "@/api/teams";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type TeamMember = {
  user_id: string;
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
  const [teamName, setTeamName] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const user = useStore($user);

  console.log(user);

  useEffect(() => {
    const fetchTeamData = async () => {
      if (user.teamId) {
        try {
          const teamData = await getTeam(user.teamId);
          setTeamName(teamData.team_name);
          fetchTeamMembers();
        } catch (error) {
          console.error("Error fetching team data:", error);
          setStatus("Error loading team data");
        }
      }
    };

    fetchTeamData();
  }, [user.teamId]);

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

  const fetchTeamMembers = async () => {
    if (!user.teamId) return;
    try {
      const membersData = await getTeamMembers(user.teamId);
      setMembers(membersData);
    } catch (error) {
      console.error("Error fetching team members:", error);
      setStatus("Error loading team members");
    }
  };

  const promoteMember = async (memberId: string) => {
    if (!user.teamId) return;
    try {
      const promotedMember = await promoteTeamMember(
        user.teamId,
        parseInt(memberId),
      );
      toast.success("Member promoted to admin!");
      fetchTeamMembers();
    } catch (error) {
      console.error("Error promoting member:", error);
      toast.error("Failed to promote member");
    }
  };

  const removeMember = async (memberId: string) => {
    if (!user.teamId) return;
    try {
      await removeTeamMember(user.teamId, parseInt(memberId));
      toast.success("Member removed from the team!");
      fetchTeamMembers();
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  return (
    <ProtectedRoute role="league">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SidebarTrigger />
          <div className="container mx-auto p-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold mb-2">{teamName}</h1>
                <p className="text-gray-500">
                  Manage your team members and permissions
                </p>
              </div>

              {status && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-center text-red-600">{status}</p>
                </div>
              )}

              <div className="bg-white rounded-lg shadow-sm border mb-8">
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold">Team Members</h2>
                </div>
                <div className="divide-y">
                  {members.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-500">No team members found.</p>
                    </div>
                  ) : (
                    members.map((member) => (
                      <div
                        key={member.user_id}
                        className="p-4 hover:bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">
                                {member.first} {member.last}
                              </h3>
                              {member.is_admin ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Admin
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Member
                                </span>
                              )}
                              {member.user_id === user.id && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {member.email}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {member.team_role}
                            </p>
                          </div>
                          {user.is_admin && member.user_id !== user.id && (
                            <div className="flex items-center gap-2">
                              {!member.is_admin && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => promoteMember(member.user_id)}
                                >
                                  Promote to Admin
                                </Button>
                              )}
                              {member.user_id !== user.id && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeMember(member.user_id)}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex flex-col items-center gap-4">
                  <h2 className="text-xl font-semibold">Invite New Members</h2>
                  <p className="text-gray-500 text-center max-w-md">
                    Generate an invite link to allow new members to join your
                    team
                  </p>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={generateInviteLink}
                  >
                    <LinkIcon className="h-4 w-4" />
                    Generate Invite Link
                  </Button>

                  {inviteLink && (
                    <div className="w-full mt-4">
                      <div className="p-4 bg-gray-50 rounded-lg border">
                        <p className="text-sm font-medium text-gray-600 mb-2">
                          Your invite link:
                        </p>
                        <div className="w-full p-3 bg-white rounded border break-all text-sm font-mono text-gray-700">
                          {inviteLink}
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex items-center gap-2 mt-4"
                          onClick={async () => {
                            await navigator.clipboard.writeText(inviteLink);
                            toast.success("Invite link copied to clipboard!");
                          }}
                        >
                          <ClipboardIcon className="h-4 w-4" />
                          Copy to Clipboard
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
