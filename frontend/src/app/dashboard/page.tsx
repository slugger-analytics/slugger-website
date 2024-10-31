"use client"
import Link from "next/link";
import Navbar from "../components/navbar/Navbar";
import Widgets from "../components/dashboard/widgets";
import Search from "../components/dashboard/search";
import ProtectedRoute from "../components/ProtectedRoutes";

export default function Dashboard() {

  return (
    <ProtectedRoute>
      {/* <Search /> */}
      <Navbar />
      <div className="flex justify-center">
        <Widgets />
      </div>
    </ProtectedRoute>
  );
}
