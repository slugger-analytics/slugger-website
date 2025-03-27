"use client";
import {
  Card,
  CardTitle,
  CardHeader,
  CardContent,
} from "../components/ui/card";
import LogoButton from "../components/navbar/LogoButton";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "../components/ui/input-otp";
import { useStore } from "@nanostores/react";
import { $otpCode, $passwordResetEmail } from "@/lib/store";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { validatePassword } from "@/lib/utils";
import { resetPassword } from "@/api/auth";

export default function EnterOtpPage() {
  const otp = useStore($otpCode);
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpValidated, setOtpValidated] = useState(true); // TODO change to false
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();
  const email = useStore($passwordResetEmail);

  const handleSubmitOtp = () => {
    if (enteredOtp !== otp) {
      toast({
        title: "Error: invalid code",
        variant: "destructive",
      });
      return;
    }
    setOtpValidated(true);
  };

  const handleResetPassword = async () => {
    try {
      if (password !== confirmPassword) {
        toast({
          title: "Error",
          description: "Passwords do not match",
          variant: "destructive",
        });
        return;
      }
      const { isValid, error } = validatePassword(password);
      if (!isValid) {
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        })
        return;
      }
      await resetPassword(email, password);
      toast({
        title: "Success!",
        description: "Your password was reset successfully.",
        variant: "success"
      })
      router.push('/sign-in');
    } catch (error) {
      toast ({
        title: "Internal error",
        description: "Please try again later",
        variant: "destructive"
      })
    }


  }

  return (
    <div className="flex justify-center items-center min-h-dvh">
      <Card>
        <CardHeader className="flex flex-col items-center justify-center">
          <div className="mb-2">
            <LogoButton width={70} height={70} />
          </div>
          <CardTitle className="text-alpbBlue">Forgot Password</CardTitle>
          <CardContent>
            {otpValidated ? (
                <div>
                    <Label htmlFor="password">Enter New Password</Label>
                    <Input 
                        id="password"
                        name="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required={true}
                    />
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={true}
                    />
                    <Button onClick={handleResetPassword}>Reset Password</Button>
                </div>
            ) : (
              <div>
                <InputOTP
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(value) => setEnteredOtp(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <Button onClick={handleSubmitOtp}>Enter</Button>
              </div>
            )}
          </CardContent>
        </CardHeader>
      </Card>
    </div>
  );
}
