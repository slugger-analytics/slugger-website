"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateOTP } from "@/lib/utils";
import { sendPasswordResetEmail } from "@/api/auth";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import LogoButton from "../components/navbar/LogoButton";
import { useStore } from "@nanostores/react";
import { $otpCode, setOtpCode, setPasswordResetEmail } from "@/lib/store";
import SubmitButton from "../components/input/SubmitButton";
import { useAuth } from "../contexts/AuthContext";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const otp = useStore($otpCode);
  const router = useRouter();
  const { setLoading } = useAuth();

  const handleSendEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Generate OTP
      const generatedOtp = generateOTP(6);
      setOtpCode(generatedOtp);

      // Send password reset email with the email and OTP
      await sendPasswordResetEmail(email, generatedOtp);
      setPasswordResetEmail(email);
      router.push("/enter-otp");
    } catch (error) {
      console.error("Error sending reset email:", error);
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
              {/* <Button
                onClick={handleSendEmail}
                className="w-full bg-alpbBlue"
              >
                Send email
              </Button> */}
              <SubmitButton btnText="Send Email" />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
