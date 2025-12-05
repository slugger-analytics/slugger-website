"use client";

import ProtectedRoute from "../components/ProtectedRoutes";

/**
 * Dashboard Page
 * 
 * This page serves as a route marker for the dashboard.
 * The actual dashboard content (TabBar, TabContent, widget iframes) is rendered
 * by PersistentDashboardContainer in the root layout, which:
 * - Stays mounted across all routes to preserve iframe state
 * - Shows/hides based on current route via CSS display property
 * - Detects this route via usePathname() hook
 * 
 * This architecture ensures widget iframes are never unmounted when navigating
 * between pages, preserving their internal state.
 * 
 * Requirements: 8.2
 */
export default function Page() {
  return (
    <ProtectedRoute>
      {/* 
       * Dashboard content is rendered by PersistentDashboardContainer.
       * This empty div serves as a placeholder for the route.
       * The persistent container overlays this when on /dashboard route.
       */}
      <div className="h-screen" aria-hidden="true" />
    </ProtectedRoute>
  );
}
