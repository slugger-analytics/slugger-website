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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  UserPlus,
  Link as LinkIcon,
  Clipboard as ClipboardIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { $user, updateStoreUser } from "@/lib/userStore";
import { toast } from "sonner";
import {
  getTeamMembers,
  promoteTeamMember,
  demoteTeamMember,
  removeTeamMember,
  getTeam,
  setClubhouseManager,
  updateMemberRole,
} from "@/api/teams";
import { createTeamAdminRequest } from "@/api/teamAdmin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog"; // UI components for the alert dialog
import { useToast } from "@/hooks/use-toast";
import { TeamMember } from "@/data/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [numAdmins, setNumAdmins] = useState<number>(0);
  const [dialgoueOpen, setDialogueOpen] = useState<boolean>(false);
  const [hasPendingRequest, setHasPendingRequest] = useState<boolean>(false);
  const { toast } = useToast();
  const user = useStore($user);

  useEffect(() => {
    const fetchTeamData = async () => {
      if (user.teamId && user.teamId !== "null") {
        try {
          const teamData = await getTeam(user.teamId);
          setTeamName(teamData.team_name);
          fetchTeamMembers();
        } catch (error) {
          console.error("Error fetching team data:", error);
          toast({
            title: "Error loading team data",
            variant: "destructive",
          });
        }
      }
    };

    fetchTeamData();
  }, [user.teamId]);

  const handleClickRemove = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDialogueOpen(true);
  };

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
      } else {
        toast({
          title: "Failed to generate invite link",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error generating invite link:", error);
      toast({
        title: "Failed to generate invite link",
        variant: "destructive",
      });
    }
  };

  const fetchTeamMembers = async () => {
    if (!user.teamId) return;
    try {
      const membersData = await getTeamMembers(user.teamId);
      setMembers(membersData);

      // Update user store if current user's admin status changed
      // Use == for loose comparison to handle string/number mismatch
      const currentUserMember = membersData.find((m) => m.user_id == user.id);
      if (currentUserMember && currentUserMember.is_admin !== user.is_admin) {
        updateStoreUser({ is_admin: currentUserMember.is_admin });
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast({
        title: "Error fetching team member",
        variant: "destructive",
      });
    }
  };

  const promoteMember = async (memberId: string) => {
    if (!user.teamId) return;
    try {
      const promotedMember = await promoteTeamMember(
        user.teamId,
        parseInt(memberId),
      );
      toast({
        title: "Member promoted to admin",
        variant: "success",
      });
      setNumAdmins((n) => n + 1);
      fetchTeamMembers();
    } catch (error) {
      console.error("Error promoting member:", error);
      toast({
        title: "Error promoting team member",
        variant: "destructive",
      });
    }
  };

  const demoteMember = async (memberId: string) => {
    if (!user.teamId) return;
    try {
      const demoteMember = await demoteTeamMember(
        user.teamId,
        parseInt(memberId),
      );
      toast({
        title: "Member demoted from admin",
        variant: "success",
      });
      setNumAdmins((n) => n - 1);
      fetchTeamMembers();
    } catch (error) {
      console.error("Error demoting member:", error);
      toast({
        title: "Error demoting team member",
        variant: "destructive",
      });
    }
  };

  const setMemberAsClubhouseManager = async (memberId: string) => {
    if (!user.teamId) return;
    try {
      await setClubhouseManager(user.teamId, parseInt(memberId));
      toast({
        title: "Member set as clubhouse manager",
        variant: "success",
      });
      fetchTeamMembers();
    } catch (error) {
      console.error("Error setting clubhouse manager:", error);
      toast({
        title: "Error setting clubhouse manager",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!user.teamId) return;
    try {
      const updatedMember = await updateMemberRole(
        user.teamId,
        parseInt(memberId),
        newRole,
      );

      // Update admin count if role changed to/from Team Admin
      if (newRole === "Team Admin") {
        setNumAdmins((n) => n + 1);
      } else if (updatedMember.is_admin === false) {
        // Check if the member was previously an admin
        const member = members.find((m) => m.user_id === memberId);
        if (member?.is_admin) {
          setNumAdmins((n) => n - 1);
        }
      }

      toast({
        title: "Role updated successfully",
        variant: "success",
      });
      fetchTeamMembers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error updating role",
        variant: "destructive",
      });
    }
  };

  const getMemberRole = (member: TeamMember): string => {
    if (member.is_admin) {
      return "Team Admin";
    } else if (member.team_role === "Clubhouse Manager") {
      return "Clubhouse Manager";
    } else {
      return "Member";
    }
  };

  const removeMember = async (
    teamId: string,
    memberId: string,
    is_admin: boolean,
  ) => {
    if (!teamId) return;
    if (is_admin && numAdmins <= 1) {
      toast({
        title: "Error removing team member",
        description: "Removing team member would leave team admin-less.",
        variant: "destructive",
      });
      return;
    }
    try {
      await removeTeamMember(teamId, parseInt(memberId));
      toast({
        title: "Successfully removed team member",
        variant: "success",
      });
      if (is_admin) {
        setNumAdmins((n) => n - 1);
      }
      if (memberId == user.id) {
        updateStoreUser({ teamId: "" });
      }
      fetchTeamMembers();
    } catch (error) {
      console.error("Error removing member:", error);
      toast({
        title: "Error removing team member",
        variant: "destructive",
      });
    }
  };

  const handleRequestTeamAdmin = async () => {
    try {
      await createTeamAdminRequest();
      setHasPendingRequest(true);
      toast({
        title: "Request submitted",
        description: "Your team admin request has been submitted for approval.",
        variant: "success",
      });
    } catch (error: any) {
      if (error.message === "User is already a team admin") {
        toast({
          title: "Already an admin",
          description: "You already have team admin permissions.",
          variant: "destructive",
        });
      } else if (error.message === "A pending request already exists for this user") {
        setHasPendingRequest(true);
        toast({
          title: "Request already pending",
          description: "You already have a pending team admin request.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Request failed",
          description: error.message || "Failed to submit team admin request.",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    const count = members.filter((m) => m.is_admin).length;
    setNumAdmins(count);
  }, [members]);

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

              <div className="bg-white rounded-lg shadow-sm border mb-8 max-w-[calc(100%-2rem)] min-w-[360px]">
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
                              {member.user_id == user.id && (
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
                          <div className="flex items-center gap-2">
                            {/* Role selector for larger screens */}
                            <div className="hidden md:flex gap-2">
                              {member.user_id != user.id && user.is_admin && (
                                <Select
                                  value={getMemberRole(member)}
                                  onValueChange={(value) =>
                                    handleRoleChange(member.user_id, value)
                                  }
                                >
                                  <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Member">Member</SelectItem>
                                    <SelectItem value="Clubhouse Manager">
                                      Clubhouse Manager
                                    </SelectItem>
                                    <SelectItem value="Team Admin">
                                      Team Admin
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                              <AlertDialog>
                                {member.user_id != user.id && user.is_admin && (
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive">
                                      Remove
                                    </Button>
                                  </AlertDialogTrigger>
                                )}
                                {member.user_id == user.id && (
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="destructive">
                                      Leave
                                    </Button>
                                  </AlertDialogTrigger>
                                )}
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {member.user_id == user.id
                                        ? "Are you sure you want to leave your team?"
                                        : `Are you sure you want to remove ${member.first} from your team?`}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {member.user_id == user.id
                                        ? "You'll need a new invite to join again."
                                        : "They'll need a new invite to join again."}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction asChild>
                                      <Button
                                        className="bg-[#EF4444] hover:bg-[#f05454]"
                                        onClick={() =>
                                          removeMember(
                                            member.team_id,
                                            member.user_id,
                                            member.is_admin,
                                          )
                                        }
                                      >
                                        {member.user_id == user.id
                                          ? "Leave"
                                          : "Remove"}
                                      </Button>
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>

                            {/* Dropdown menu for smaller screens */}
                            <div className="md:hidden">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost">
                                    <MoreVertical className="h-5 w-5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {member.user_id != user.id && user.is_admin && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleRoleChange(member.user_id, "Member")
                                        }
                                      >
                                        Set as Member
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleRoleChange(
                                            member.user_id,
                                            "Clubhouse Manager",
                                          )
                                        }
                                      >
                                        Set as Clubhouse Manager
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleRoleChange(member.user_id, "Team Admin")
                                        }
                                      >
                                        Set as Team Admin
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuItem
                                    onClick={(e) => handleClickRemove(e)}
                                    className="bg-[#EF4444] text-white hover:bg-[#f05454]"
                                  >
                                    {member.user_id == user.id
                                      ? "Leave"
                                      : "Remove"}
                                  </DropdownMenuItem>
                                  <AlertDialog
                                    open={dialgoueOpen}
                                    onOpenChange={setDialogueOpen}
                                  >
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          {member.user_id == user.id
                                            ? "Are you sure you want to leave your team?"
                                            : `Are you sure you want to remove ${member.first} from your team?`}
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          {member.user_id == user.id
                                            ? "You'll need a new invite to join again."
                                            : "They'll need a new invite to join again."}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          Cancel
                                        </AlertDialogCancel>
                                        <AlertDialogAction asChild>
                                          <Button
                                            className="bg-[#EF4444] hover:bg-[#f05454]"
                                            onClick={() => {
                                              removeMember(
                                                member.team_id,
                                                member.user_id,
                                                member.is_admin,
                                              );
                                              setDialogueOpen(false);
                                            }}
                                          >
                                            {member.user_id == user.id
                                              ? "Leave"
                                              : "Remove"}
                                          </Button>
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
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
                            toast({
                              title: "Invite link copied to clipboard!",
                              variant: "success",
                            });
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

              {/* Request Team Admin Section - Only show if user is not admin and has a team */}
              {!user.is_admin && user.teamId && user.teamId !== "null" && user.teamId !== "" && (
                <div className="bg-white rounded-lg shadow-sm border p-6 mt-8">
                  <div className="flex flex-col items-center gap-4">
                    <h2 className="text-xl font-semibold">Request Team Admin Access</h2>
                    <p className="text-gray-500 text-center max-w-md">
                      Request elevated permissions to manage team members and settings
                    </p>
                    {hasPendingRequest ? (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 w-full max-w-md">
                        <p className="text-sm text-yellow-800 text-center">
                          Your team admin request is pending approval from a site administrator.
                        </p>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={handleRequestTeamAdmin}
                      >
                        <UserPlus className="h-4 w-4" />
                        Request Team Admin
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
