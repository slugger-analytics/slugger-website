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
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import LogoButton from "../components/navbar/LogoButton";
import { useStore } from "@nanostores/react";
import { $otpCode, setOtpCode, setPasswordResetEmail } from "@/lib/store";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const otp = useStore($otpCode);
  const router = useRouter();

  const handleSendEmail = async () => {
    if (!email || !email.includes("@")) {
      alert("Please enter a valid email address");
      return;
    }
    console.log("trying to send...");
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
      alert("Failed to send reset email");
    }
  };
  return (
    <div className="flex justify-center items-center min-h-dvh">
      <Card>
        <CardHeader className="flex flex-col items-center justify-center">
          <div className="mb-2">
            <LogoButton width={70} height={70} />
          </div>
          <CardTitle className="text-alpbBlue">Forgot Password</CardTitle>
          <CardContent>
            <div>
              <Label htmlFor="email">Enter Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@example.com"
                required={true}
              />
              <Button onClick={handleSendEmail}>Send email</Button>
            </div>
          </CardContent>
        </CardHeader>
      </Card>
    </div>
  );
}
