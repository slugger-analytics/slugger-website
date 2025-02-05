"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SignupForm } from "../register-account/SignupForm";

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <SignupForm />
    </div>
  );
} 