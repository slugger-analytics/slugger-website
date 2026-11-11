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
import {
  permissionsForSeat,
  readViewAs,
  resolveAccountSeat,
  SEATS,
  type AccountPermissions,
} from "@/lib/accountPermissions";

interface ProtectedRouteProps {
  role?: string;
  permission?: keyof AccountPermissions;
  children: React.ReactNode;
}

/**
 * ProtectedRoute Component
 * 
 * Relies on AuthContext for session validation (which happens on mount).
 * Only handles redirects based on authentication state and role requirements.
 */
const ProtectedRoute = ({ role, permission, children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAuth();
  const user = useStore($user);
  const router = useRouter();

  useEffect(() => {
    // Wait for auth loading to complete before making redirect decisions
    if (loading) return;

    // A cleared profile is not a Public Access login. Send it to the welcome page.
    if (!isAuthenticated || !user.id) {
      router.push("/");
      return;
    }

    const realSeat = resolveAccountSeat({
      role: user.role,
      is_admin: user.is_admin,
      teamId: user.teamId,
      teamRole: typeof user.teamRole === "string" ? user.teamRole : undefined,
    });
    const seat = realSeat === SEATS.WEBSITE_ADMIN ? readViewAs() || realSeat : realSeat;
    const perms = permissionsForSeat(seat);

    const allowed = !permission
      || perms[permission]
      || (permission === "registerPublicWidget" && perms.createPrivateWidget);
    if (permission && !allowed) {
      router.push(perms.aroundLeague ? "/around-league" : "/sign-in");
      return;
    }

    // Check role-based access if a specific role is required
    if (!permission && role && user.role && user.role.toLowerCase() !== role) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, user.role, user.is_admin, user.teamId, user.teamRole, loading, router, role, permission]);

  // Display loading while authentication state is being determined
  if (loading) {
    return <Loading />;
  }

  // Don't render the app for a signed-out or cleared profile.
  if (!isAuthenticated || !user.id) {
    return <Loading />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
