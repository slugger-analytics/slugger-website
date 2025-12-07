"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/app/components/app-sidebar";
import {
    SidebarInset,
    SidebarProvider,
} from "@/app/components/ui/sidebar";
import TabBar from "@/app/components/dashboard/tab-bar";
import TabContent from "@/app/components/dashboard/tab-content";
import DashboardLoading from "@/app/components/dashboard/dashboard-loading";
import { initializeTabStore } from "@/lib/tabStore";
import { useAuth } from "@/app/contexts/AuthContext";
import useQueryWidgets from "@/app/hooks/use-query-widgets";

/**
 * PersistentDashboardContainer Component
 * 
 * A layout-level component that keeps the widgets/dashboard page mounted across route changes.
 * This preserves widget iframe state when navigating between pages.
 * 
 * Key behaviors:
 * - Always stays mounted in the DOM regardless of current route
 * - Uses CSS display property to show/hide based on current route
 * - Contains the entire tab system (TabBar + TabContent + all iframes)
 * - Listens to route changes via usePathname() hook
 * 
 * Requirements: 8.1, 8.2
 */
export default function PersistentDashboardContainer() {
    const pathname = usePathname();
    const { loading: authLoading, isAuthenticated } = useAuth();
    const { widgetsLoading } = useQueryWidgets();

    // Determine if widgets/dashboard page should be visible based on current route
    const isDashboardRoute = pathname === "/dashboard";
    const isVisible = isDashboardRoute && isAuthenticated;

    // Initialize tab store once when component mounts
    useEffect(() => {
        if (isAuthenticated) {
            initializeTabStore();
        }
    }, [isAuthenticated]);

    // Don't render anything if user is not authenticated
    if (!isAuthenticated) {
        return null;
    }

    const isLoading = authLoading || widgetsLoading;

    return (
        <div
            style={{ display: isVisible ? "block" : "none" }}
            className="fixed inset-0 z-40"
            data-testid="persistent-dashboard-container"
        >
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    {isLoading ? (
                        <DashboardLoading />
                    ) : (
                        <div className="flex flex-col h-full">
                            {/* Tab bar at top of content area */}
                            <TabBar />
                            {/* Tab content area - shows Home (widget gallery) or widget iframes */}
                            <TabContent />
                        </div>
                    )}
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
}
