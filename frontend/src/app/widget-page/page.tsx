"use client";
import { AppSidebar } from "@/app/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/app/components/ui/sidebar";
import ProtectedRoute from "../components/ProtectedRoutes";
import useQueryWidgets from "../hooks/use-query-widgets";
import { useAuth } from "../contexts/AuthContext";
import DashboardLoading from "../components/dashboard/dashboard-loading";
import DashboardContent from "../components/dashboard/dashboard-content";

export default function Page() {
  const { loading } = useAuth();
  const { widgetsLoading } = useQueryWidgets();

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {" "}
          {/* Ensures the route is protected and only accessible to authenticated users */}
          <SidebarTrigger />
          {loading || widgetsLoading ? (
            <DashboardLoading />
          ) : (
            <DashboardContent />
          )}
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
