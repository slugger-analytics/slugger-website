"use client";
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
import DashboardContent from "../components/dashboard/dashboard-content";


export default function DashboardPage() {
  const name = "John"; // replace with real user name


  return (
    <ProtectedRoute>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          {" "}
          {/* Ensures the route is protected and only accessible to authenticated users */}
          <SidebarTrigger />
          <div className="w-full h-full p-6">
            <div
              className="
          grid
          grid-cols-4
          grid-rows-4
          gap-4
          w-full
          h-full
        "
            >
              {/* ---------- HELLO (TOP LEFT) ---------- */}
              <div className="col-span-2 row-span-1 bg-white rounded-xl shadow p-4">
                <p className="text-sm text-gray-400">Hello,</p>
                <h1 className="text-2xl font-bold">{name}</h1>
              </div>

              {/* ---------- (TOP RIGHT) ---------- */}
              <div className="col-span-2 row-span-1 bg-white rounded-xl shadow p-4 flex flex-col items-end justify-center text-right">
              </div>

              {/* ---------- MIDDLE GRID: PLACEHOLDERS FOR YOUR 5 ITEMS ---------- 
              <div className="col-span-1 row-span-1 bg-white rounded-xl shadow p-4">
                <h2 className="text-lg opacity-40">Item 1</h2>
              </div>

              <div className="col-span-1 row-span-1 bg-white rounded-xl shadow p-4">
                <h2 className="text-lg opacity-40">Item 2</h2>
              </div>

              <div className="col-span-1 row-span-1 bg-white rounded-xl shadow p-4">
                <h2 className="text-lg opacity-40">Item 3</h2>
              </div>

              <div className="col-span-1 row-span-1 bg-white rounded-xl shadow p-4">
                <h2 className="text-lg opacity-40">Item 4</h2>
              </div>*/}

              {/* ---------- ANOTHER ROW OF PLACEHOLDERS ---------- */}
              <div className="col-span-2 row-span-1 bg-white rounded-xl shadow p-4">
                <h2 className="text-lg opacity-40">Wide Left</h2>
              </div>

              <div className="col-span-2 row-span-1 bg-white rounded-xl shadow p-4">
                <h2 className="text-lg opacity-40">Wide Right</h2>
              </div>

              {/* ---------- RECENT WIDGETS (BOTTOM RIGHT) ---------- */}
              <div className="col-span-4 row-span-1 bg-white rounded-xl shadow p-4">
                <h2 className="text-xl font-semibold mb-2">Recent Widgets</h2>

                {/* Replace this with your real widget list later */}
                <div className="text-gray-400">No widgets yet…</div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}

