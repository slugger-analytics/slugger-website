"use client";

import * as React from "react";
import { Home, BookOpenCheck, BookText, Bug, Code, LayoutGridIcon } from "lucide-react";

import { NavUser } from "@/app/components/nav-user";
import { NavMain } from "@/app/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/app/components/ui/sidebar";
import Image from "next/image";
import { useStore } from "@nanostores/react";
import { $user } from "@/lib/userStore";
import { Users } from "lucide-react";
import {
  readViewAs,
  resolveAccountSeat,
  seatLabel,
  SEATS,
  VIEW_AS_SEATS,
  writeViewAs,
  type AccountSeat,
} from "@/lib/accountPermissions";
import { useRouter } from "next/navigation";
// This is sample data.

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const user = useStore($user);
  const router = useRouter();
  const [roleDisplay, setRoleDisplay] = React.useState("");
  const [viewAs, setViewAs] = React.useState<AccountSeat | "">("");
  const [mounted, setMounted] = React.useState(false);
  const realSeat = resolveAccountSeat({
    role: user.role,
    is_admin: user.is_admin,
    teamId: user.teamId,
    teamRole: typeof user.teamRole === "string" ? user.teamRole : undefined,
  });
  const effectiveSeat =
    realSeat === SEATS.WEBSITE_ADMIN && viewAs ? viewAs : realSeat;
  const navMain = [
    {
      title: "Home",
      url: "/homepage",
      icon: Home,
      isActive: true,
    },
    {
      title: "Widgets",
      url: "/dashboard",
      icon: LayoutGridIcon,
      isActive: true,
    },
    {
      title: "Pending Developers",
      url: "/pending-developers",
      icon: Home,
      isActive: false,
    },
    {
      title: "Pending Widgets",
      url: "/pending-widgets",
      icon: Home,
      isActive: false,
    },
    {
      title: "Team Admins",
      url: "/team-admins",
      icon: Users,
      isActive: false,
    },
    {
      title: "Widget Development",
      url: "/widget-development",
      icon: Code,
      isActive: false,
    },
    {
      title: "Register Widget",
      url: "/register-widget",
      icon: BookOpenCheck,
      isActive: false,
    },
    {
      title: "Around the League",
      url: "/around-league",
      icon: BookOpenCheck,
      isActive: false,
    },
    {
      title:
        effectiveSeat === SEATS.LEAGUE_OFFICE || effectiveSeat === SEATS.WEBSITE_ADMIN
          ? "Teams"
          : "My Team",
      url: "/team-page",
      icon: Users,
      isActive: false,
    },
    {
      title: "API Documentation",
      url: "/api-docs",
      icon: BookText,
      isActive: false,
    },
    {
      title: "Report a Bug",
      url: "https://docs.google.com/forms/d/e/1FAIpQLScyL8zEK3hY5Qj-UVGXFTAA3G0pK88RNoIbWfJ0F6itVTlGpA/viewform?usp=dialog",
      icon: Bug,
      isActive: false,
    },
  ];
  React.useEffect(() => {
    const preview = realSeat === SEATS.WEBSITE_ADMIN ? readViewAs() : null;
    setViewAs(preview || "");
    setRoleDisplay(seatLabel(preview || realSeat));
    setMounted(true);
  }, [realSeat, user.role, user.is_admin, user.teamId, user.teamRole]);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Image
                    src="/alpb-logo.png"
                    width={30}
                    height={30}
                    alt="ALPB Logo"
                    className="h-auto w-auto"
                    sizes="30px"
                  />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">SLUGGER</span>
                  <span className="font-normal">{roleDisplay}</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        {mounted && realSeat === SEATS.WEBSITE_ADMIN && (
          <div className="px-3 pb-3">
            <label className="mb-1 block text-xs text-gray-500" htmlFor="view-as">
              View site as
            </label>
            <select
              id="view-as"
              className="w-full rounded border bg-white px-2 py-1 text-sm"
              value={viewAs}
              onChange={(event) => {
                const next = event.target.value as AccountSeat | "";
                writeViewAs(next || null);
                setViewAs(next);
                setRoleDisplay(seatLabel(next || SEATS.WEBSITE_ADMIN));
                router.push("/around-league");
              }}
            >
              <option value="">Website Admin</option>
              {VIEW_AS_SEATS.filter((seat) => seat !== SEATS.WEBSITE_ADMIN).map((seat) => (
                <option key={seat} value={seat}>
                  {seatLabel(seat)}
                </option>
              ))}
            </select>
          </div>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
