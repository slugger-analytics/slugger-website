"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const PLAYER_PORTAL_UPDATES_URL = "https://www.alpb-analytics.com/widgets/player-portal/updates";

export default function PlayerPortalUpdatesRedirectPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace("/sign-in");
      return;
    }
    window.location.replace(PLAYER_PORTAL_UPDATES_URL);
  }, [isAuthenticated, loading, router]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Redirecting to Player Portal Updates...
      </div>
    </main>
  );
}
