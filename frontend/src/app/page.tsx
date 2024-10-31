"use client";

import Navbar from "./components/navbar/Navbar";
import Link from "next/link";
import { AuthProvider } from './contexts/AuthContext';

export default function Home() {
  return (
    <AuthProvider>
      <Navbar />
      <div className="bg-white shadow-lg rounded-lg p-10 flex flex-col items-center space-y-8">
        <h1 className="text-4xl font-extrabold text-gray-800 mb-4">
          Welcome to ALPB Analytics
        </h1>
        <p className="text-lg text-gray-500 mb-6">Hello from Home</p>
        {/* Sign in button */}
        <Link href="/sign-in">
          <button className="text-lg font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 px-6 py-3 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105">
            Sign in
          </button>
        </Link>
        {/* Register button */}
        <Link href="/register-account">
          <button className="text-lg font-semibold text-white bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 px-6 py-3 rounded-full shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105">
            Register
          </button>
        </Link>
      </div>
    </AuthProvider>
  );
}
