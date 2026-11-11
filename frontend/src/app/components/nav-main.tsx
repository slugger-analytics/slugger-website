"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/app/components/ui/sidebar";
import { useRouter } from "next/navigation";
import { useStore } from "@nanostores/react";
import { $user } from "@/lib/userStore";
import { useAuth } from "../contexts/AuthContext";
import {
  permissionsForSeat,
  readViewAs,
  resolveAccountSeat,
  SEATS,
} from "@/lib/accountPermissions";

type Item = {
  title: string;
  url: string;
  icon: LucideIcon;
  isActive?: boolean;
};

export function NavMain({ items }: { items: Item[] }) {
  const router = useRouter();
  const user = useStore($user) || {};
  const { isAuthenticated } = useAuth();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const realSeat = useMemo(
    () =>
      resolveAccountSeat({
        role: user?.role,
        is_admin: user?.is_admin,
        teamId: user?.teamId,
        teamRole: user?.teamRole,
      }),
    [user?.role, user?.is_admin, user?.teamId, user?.teamRole],
  );
  const preview = mounted && realSeat === SEATS.WEBSITE_ADMIN ? readViewAs() : null;
  const perms = permissionsForSeat(preview || realSeat);

  const shouldShowItem = (title: string) => {
    if (title === "Register Widget") return perms.registerPublicWidget || perms.createPrivateWidget;
    if (title === "API Documentation") return perms.apiDocs;
    if (title === "My Team" || title === "Teams") return perms.myTeam;
    if (["Pending Developers", "Pending Widgets", "Team Admins", "Widget Development"].includes(title)) return perms.approveSite;
    if (title === "Home") return perms.home;
    if (title === "Widgets") return perms.widgets;
    if (title === "Around the League") return perms.aroundLeague;
    return true;
  };

  const handleRedirect = (url: string) => router.push(url);

  // ===== Server render & initial client render: neutral placeholders (no filtering) =====
  if (!mounted) {
    return (
      <SidebarMenu>
        {items
          .filter((it) => it.title !== "Settings") // keep only deterministic rules here
          .map((it) => (
            <SidebarMenuItem key={it.title}>
              <SidebarMenuButton asChild>
                <div className="flex items-start p-5">
                  <span aria-hidden className="inline-block mr-3 h-5 w-5 rounded-sm bg-gray-200 dark:bg-gray-700" />
                  {/* placeholder label to avoid text mismatch */}
                  <span className="opacity-60">Loading…</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
      </SidebarMenu>
    );
  }

  // ===== After mount: real icons + role-based filtering =====
  return (
    <SidebarMenu>
      {items
        .filter((it) => it.title !== "Settings")
        .filter((it) => shouldShowItem(it.title))
        .map((item) => {
          const Icon = item.icon;
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild onClick={() => handleRedirect(item.url)}>
                <button className="flex items-start p-5">
                  <Icon className="inline-block mr-3" aria-hidden />
                  <span>{item.title}</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
    </SidebarMenu>
  );
}
