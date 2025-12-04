"use client";
import { useEffect } from "react";
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
import TabBar from "../components/dashboard/tab-bar";
import TabContent from "../components/dashboard/tab-content";
import { initializeTabStore } from "@/lib/tabStore";

export default function Page() {
  const { loading } = useAuth();
  const { widgetsLoading } = useQueryWidgets();

  // Initialize tab store on mount to restore persisted state
  useEffect(() => {
    initializeTabStore();
  }, []);

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {loading || widgetsLoading ? (
            <DashboardLoading />
          ) : (
            <div className="flex flex-col h-[calc(100vh-2rem)]">
              {/* Tab bar at top of content area */}
              <TabBar />
              {/* Tab content area - shows Home (widget gallery) or widget iframes */}
              <TabContent />
            </div>
          )}
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
