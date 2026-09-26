"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "@/api/auth";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import LogoButton from "../components/navbar/LogoButton";
import { setPasswordResetEmail } from "@/lib/userStore";
import SubmitButton from "../components/input/SubmitButton";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const router = useRouter();
  const { setLoading } = useAuth();
  const { toast } = useToast();

  const handleSendEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(email);
      setPasswordResetEmail(email);
      router.push("/enter-otp");
    } catch (error) {
      console.error("Error sending reset email:", error);
      toast({
        title: "Unable to send reset email",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex justify-center items-center min-h-dvh">
      <Card className="w-full max-w-md p-6">
        <CardHeader className="flex flex-col items-center justify-center space-y-4">
          <div className="mb-2">
            <LogoButton width={70} height={70} />
          </div>
          <CardTitle className="text-gray-500">Reset Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => handleSendEmail(e)}>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="block mb-2">
                  Enter Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@example.com"
                  required={true}
                  className="w-full"
                />
              </div>
              <SubmitButton btnText="Send Email" />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
