"use client";

import { useState, useEffect } from "react";
import { fetchPendingDevelopers, approveDeveloper } from "@/api/developer";
import { PendingDeveloper } from "@/data/types";
import ProtectedRoute from "../components/ProtectedRoutes";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/app/components/ui/sidebar"
import { useAuth } from "../contexts/AuthContext";
import DashboardLoading from "../components/dashboard/dashboard-loading";
import { AppSidebar } from "@/app/components/app-sidebar";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function PendingDevelopersPage() {
  const [requests, setRequests] = useState<PendingDeveloper[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const { loading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const loadPendingDevelopers = async () => {
      try {
        const data = await fetchPendingDevelopers();
        setRequests(data);
      } catch (error) {
        console.error("Error fetching developers:", error);
      }
    };

    loadPendingDevelopers();
  }, []);

  const handleApproveDeveloper = async (requestId: string) => {
    try {
      await approveDeveloper(requestId);
      toast({
        title: "Success",
        description: "Developer account approved and API key sent",
        variant: "success"
      })
      setRequests((prev) => prev.filter((req) => req.request_id !== requestId));
    } catch (error: any) {
      toast({
        title: "Error approving developer",
        description: error?.message || undefined,
        variant: "destructive",
      });
    }
  };

  return (
      <ProtectedRoute role="master">
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {" "}
          {/* Ensures the route is protected and only accessible to authenticated users */}
          <SidebarTrigger />
          {loading ? (
            <DashboardLoading />
          ) : (
              <div className="container mx-auto p-8">
                <h1 className="text-3xl mb-8 text-center">
                  Pending Developers
                </h1>

                {status && (
                  <p className="text-center text-green-600 mb-4 font-semibold">
                    {status}
                  </p>
                )}

                {requests.length === 0 ? (
                  <p className="text-center text-gray-600">No pending developers.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {requests.map((request) => (
                      <Card
                        key={request.request_id}
                        className="p-6 bg-white rounded-lg shadow-md border border-gray-200"
                      >
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          {request.first_name} {request.last_name}
                        </h3>
                        <p className="text-gray-600 mb-2">{request.email}</p>
                        <p className="text-sm text-yellow-600 mb-4">
                          Status: {request.status}
                        </p>
                        <div className="flex justify-between">
                          <Button className="bg-green-500 hover:bg-green-400" onClick={() => handleApproveDeveloper(request.request_id)}>
                            Approve
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
          )}
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
