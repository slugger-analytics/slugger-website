"use client"

import { AppSidebar } from "@/app/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/app/components/ui/sidebar";
import ProtectedRoute from "../components/ProtectedRoutes";
import DashboardLoading from "../components/dashboard/dashboard-loading";
import { useAuth } from "../contexts/AuthContext";
import Settings from "./settings";

export default function SettingsPage() {
    const { loading } = useAuth();

    return (
        <ProtectedRoute>
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    {" "}
                    {/* Ensures the route is protected and only accessible to authenticated users */}
                    <SidebarTrigger />
                    {loading ? (
                        <DashboardLoading />
                    ) : (
                        <Settings />
                    )}
                </SidebarInset>
            </SidebarProvider>
        </ProtectedRoute>
    )
}