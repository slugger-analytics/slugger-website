"use client";

import Link from "next/link";
import { AuthProvider } from "./contexts/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "@/app/components/ui/card";

export default function Home() {
  return (
    <AuthProvider>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 py-10 px-4">
        <Card className="w-[500px] shadow-lg">
          <CardHeader className="flex flex-col items-center justify-center">
            <h1 className="text-3xl font-extrabold text-gray-800 mb-2 text-center">
              Welcome to ALPB Analytics
            </h1>
            <CardDescription className="text-gray-500 text-center">
              Your go-to platform for advanced analytics and insights.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6 mt-8">
            {/* Sign in button */}
            <Link href="/sign-in">
              <button className="w-full text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 px-6 py-3 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105">
                Sign In
              </button>
            </Link>
            {/* Register button */}
            <Link href="/register-account">
              <button className="w-full text-lg font-semibold text-white bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 px-6 py-3 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105">
                Register
              </button>
            </Link>
          </CardContent>
        </Card>
        <div className="mt-6 text-sm text-gray-500">
          <p>
            Questions?{" "}
            <Link href="/help" className="text-[#2272B4] hover:underline">
              Contact bsantan3@jh.edu, dbenjam9@jh.edu, or xlu62@jh.edu.
            </Link>
          </p>
        </div>
      </div>
    </AuthProvider>
  );
}
