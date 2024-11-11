"use client"
import Link from "next/link";
import Navbar from "../components/navbar/Navbar";
import Widgets from "../components/dashboard/widgets";
import Search from "../components/dashboard/search";
import ProtectedRoute from "../components/ProtectedRoutes";
import { $widgets } from "@/lib/store";
import { useStore } from "@nanostores/react";
import { useEffect } from "react";
import RegisterWidget from "../components/dashboard/register-widget";
import useQueryWidgets from "../hooks/use-query-widgets";

export default function Dashboard() {
  const { widgets } = useQueryWidgets();

  return (
    <ProtectedRoute>
      {/* <Search /> */}
      <Navbar />
      <div className="flex justify-center p-10">
        {widgets.length > 0 ? <Widgets /> : <RegisterWidget />}

      </div>
    </ProtectedRoute>
  );
}
