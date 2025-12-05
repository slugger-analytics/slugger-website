"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SubmitButton from "../components/input/SubmitButton";
import { loginUser } from "../../api/auth";
import { useAuth } from "../contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import LogoButton from "../components/navbar/LogoButton";
import { setUser } from "@/lib/userStore";
import { LoginType, UserAPIResType } from "@/data/types";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

const LoginForm = () => {
  const router = useRouter();
  const { setIdToken, setAccessToken, setLoading } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      setLoading(true);
      const result = (await loginUser(email, password)) as LoginType;
      // TODO set user info here!!!
      setUser(result.user);
      setAccessToken(result.authData.accessToken); // Set the access token in the context
      setIdToken(result.authData.idToken); // Set the ID token in the context

      // Handle successful login and redirect based on user role
      if (result.user.role === "admin") {
        router.push("/pending-developers"); // Redirect to pending developers page for admin role
      } else {
        router.push("/homepage"); // Redirect to homepage for other roles
      }
    } catch (error) {
      toast({
        title: "Login failed. Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-[450px] max-w-[calc(100%-2rem)] min-w-[360px] pb-5 px-5">
      <CardHeader className="flex flex-col items-center justify-center">
        <div className="mb-2">
          <LogoButton width={70} height={70} />
        </div>
        <CardDescription>Sign in to continue to SLUGGER</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Input
                name="email"
                type="email"
                required={true}
                placeholder="Email"
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Input
                name="password"
                type="password"
                required={true}
                placeholder="Password"
              />
            </div>
          </div>
          <SubmitButton btnText="Continue" className="mt-8" />
          <div className="flex items-center justify-center mt-5">
            <Link href="/reset-password" className="text-[#2272B4] text-xs">
              Forgot your password?
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default LoginForm;
