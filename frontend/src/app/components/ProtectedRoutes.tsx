"use client";

/**
 * ProtectedRoute Component
 *
 * A higher-order component (HOC) that wraps around protected content to enforce authentication
 * and optional role-based access control. Redirects unauthenticated users to the sign-in page
 * and unauthorized users to an unauthorized access page.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";
import Loading from "./layout/loading";
import { useStore } from "@nanostores/react";
import { $user } from "@/lib/userStore";

interface ProtectedRouteProps {
  role?: string;
  children: React.ReactNode;
}

/**
 * ProtectedRoute Component
 * 
 * Relies on AuthContext for session validation (which happens on mount).
 * Only handles redirects based on authentication state and role requirements.
 */
const ProtectedRoute = ({ role, children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth();
  const user = useStore($user);
  const router = useRouter();

  useEffect(() => {
    // Wait for auth loading to complete before making redirect decisions
    if (loading) return;

    // Redirect unauthenticated users to sign-in
    if (!isAuthenticated) {
      router.push("/sign-in");
      return;
    }

    // Check role-based access if a specific role is required
    if (role && user.role && user.role.toLowerCase() !== role) {
      router.push("/widgets");
    }
  }, [isAuthenticated, user.role, loading, router, role]);

  // Display loading while authentication state is being determined
  if (loading) {
    return <Loading />;
  }

  // Don't render children until authenticated
  if (!isAuthenticated) {
    return <Loading />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
