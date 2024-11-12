"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  role?: string;
  children: React.ReactNode;
}

const ProtectedRoute = ({ role, children }: ProtectedRouteProps) => {
  const { isAuthenticated, userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      console.log(isAuthenticated);
      if (!isAuthenticated) {
        router.push("/sign-in");
      } else if (role && userRole !== role) {
        router.push("/unauthorized"); // If you have role-based access
      }
    }
  }, [isAuthenticated, userRole, loading, router]);

  if (loading) {
    return <p>Loading...</p>;
  }

  return isAuthenticated ? <>{children}</> : null;
};

export default ProtectedRoute;
