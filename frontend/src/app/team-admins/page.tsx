/**
 * Team Admin Management Page
 *
 * Site admin interface for managing team admin requests and permissions.
 * Displays two sections:
 * 1. Pending Requests - Team members requesting admin permissions
 * 2. Current Team Admins - Existing team admins across all teams
 *
 * Only accessible to users with "admin" role.
 */
"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/app/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/app/components/ui/sidebar";
import ProtectedRoute from "../components/ProtectedRoutes";
import {
  fetchPendingTeamAdmins,
  approveTeamAdmin,
  declineTeamAdmin,
  fetchAllTeamAdmins,
  revokeTeamAdminPermissions,
} from "@/api/teamAdmin";
import { PendingTeamAdmin, TeamMember } from "@/data/types";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";

export default function TeamAdminsPage() {
  const [pendingRequests, setPendingRequests] = useState<PendingTeamAdmin[]>(
    [],
  );
  const [teamAdmins, setTeamAdmins] = useState<TeamMember[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Fetch initial data on component mount
   * Loads both pending requests and existing team admins in parallel
   */
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Fetch both pending requests and current admins simultaneously
        const [pending, admins] = await Promise.all([
          fetchPendingTeamAdmins(),
          fetchAllTeamAdmins(),
        ]);
        setPendingRequests(pending);
        setTeamAdmins(admins);
      } catch (error) {
        console.error("Error fetching team admin data:", error);
        setStatus("Error loading team admin data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  /**
   * Approves a team admin request
   * Removes from pending list and refreshes the current admins list
   */
  const handleApproveRequest = async (requestId: number) => {
    try {
      const result = await approveTeamAdmin(requestId);
      setStatus(result.message || "Team admin request approved successfully");

      // Remove from pending requests
      setPendingRequests((prev) =>
        prev.filter((request) => request.request_id !== requestId),
      );

      // Refresh team admins list to show the newly approved admin
      const admins = await fetchAllTeamAdmins();
      setTeamAdmins(admins);
    } catch (error: any) {
      setStatus(error.message || "Error approving team admin request.");
    }
  };

  /**
   * Declines a team admin request
   * Removes the request without granting permissions
   */
  const handleDeclineRequest = async (requestId: number) => {
    try {
      const result = await declineTeamAdmin(requestId);
      setStatus(result.message || "Team admin request declined successfully");

      // Remove from pending requests
      setPendingRequests((prev) =>
        prev.filter((request) => request.request_id !== requestId),
      );
    } catch (error: any) {
      setStatus(error.message || "Error declining team admin request.");
    }
  };

  /**
   * Revokes team admin permissions from a user
   * Removes the user from the current admins list
   */
  const handleRevokePermissions = async (userId: string) => {
    try {
      const result = await revokeTeamAdminPermissions(userId);
      setStatus(result.message || "Team admin permissions revoked successfully");

      // Remove from team admins list
      setTeamAdmins((prev) => prev.filter((admin) => admin.user_id !== userId));
    } catch (error: any) {
      setStatus(error.message || "Error revoking team admin permissions.");
    }
  };

  return (
    <ProtectedRoute role="admin">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SidebarTrigger />
          <div className="container mx-auto p-8">
            <h1 className="text-3xl mb-8 text-center">Team Admin Management</h1>

            {status && (
              <p className="text-center text-green-600 mb-4 font-semibold">
                {status}
              </p>
            )}

            {loading ? (
              <p className="text-center text-gray-600">Loading team admin data...</p>
            ) : (
              <>
                {/* Pending Requests Section */}
                <div className="mb-12">
                  <h2 className="text-2xl mb-4 font-semibold">Pending Requests</h2>
                  {pendingRequests.length === 0 ? (
                    <p className="text-center text-gray-600">
                      No pending team admin requests.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {pendingRequests.map((request) => (
                        <Card
                          key={request.request_id}
                          className="p-6 bg-white rounded-lg shadow-md border border-gray-200"
                        >
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            {request.first_name} {request.last_name}
                          </h3>
                          <p className="text-gray-600 mb-2">{request.email}</p>
                          <p className="text-sm text-gray-600 mb-2">
                            Team: {request.team_name}
                          </p>
                          <p className="text-sm text-yellow-600 mb-4">
                            Status: {request.status}
                          </p>
                          <div className="flex justify-between">
                            <Button
                              className="bg-red-500 hover:bg-red-400"
                              onClick={() =>
                                handleDeclineRequest(request.request_id)
                              }
                            >
                              Decline
                            </Button>
                            <Button
                              className="bg-green-500 hover:bg-green-400"
                              onClick={() =>
                                handleApproveRequest(request.request_id)
                              }
                            >
                              Approve
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Existing Team Admins Section */}
                <div>
                  <h2 className="text-2xl mb-4 font-semibold">Current Team Admins</h2>
                  {teamAdmins.length === 0 ? (
                    <p className="text-center text-gray-600">
                      No team admins found.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                      {teamAdmins.map((admin) => (
                        <Card
                          key={admin.user_id}
                          className="p-6 bg-white rounded-lg shadow-md border border-gray-200"
                        >
                          <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            {admin.first} {admin.last}
                          </h3>
                          <p className="text-gray-600 mb-2">{admin.email}</p>
                          <p className="text-sm text-gray-600 mb-4">
                            Team: {admin.team_name}
                          </p>
                          <Button
                            className="w-full bg-red-500 hover:bg-red-400"
                            onClick={() => handleRevokePermissions(admin.user_id)}
                          >
                            Revoke Permissions
                          </Button>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
