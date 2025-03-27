"use client";
import { AppSidebar } from "@/app/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/app/components/ui/sidebar";
import ProtectedRoute from "../components/ProtectedRoutes";
import useQueryWidgets from "../hooks/use-query-widgets";
import Search from "../components/dashboard/search";
import FilterDropdown from "../components/dashboard/filter-dropdown";
import RegisterWidget from "../components/dashboard/register-widget";
import Widgets from "../components/dashboard/widgets";
import { useStore } from "@nanostores/react";
import { $user } from "@/lib/store";
import { useAuth } from "../contexts/AuthContext";
import SortDropdown from "../components/dashboard/sort-dropdown";
import ViewToggle from "../components/dashboard/view-toggle";
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
