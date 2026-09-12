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
import { $passwordResetEmail } from "@/lib/userStore";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { validatePassword } from "@/lib/utils";
import { resetPassword, verifyPasswordResetOtp } from "@/api/auth";
import { useAuth } from "../contexts/AuthContext";
import SubmitButton from "../components/input/SubmitButton";

export default function EnterOtpPage() {
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpValidated, setOtpValidated] = useState(false);
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();
  const email = useStore($passwordResetEmail);
  const { logout, setLoading } = useAuth();

  useEffect(() => {
    if (!email) {
      router.replace("/reset-password");
    }
  }, [email, router]);

  const handleSubmitOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyPasswordResetOtp(email, enteredOtp);
      setOtpValidated(true);
    } catch (error) {
      toast({
        title: "Error: invalid code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setLoading(true);
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
        });
        return;
      }
      await resetPassword(email, password, enteredOtp);
      await logout();
      toast({
        title: "Success!",
        description: "Your password was reset successfully.",
        variant: "success",
      });
      router.push("/sign-in");
    } catch (error) {
      toast({
        title: "Unable to reset password",
        description:
          error instanceof Error ? error.message : "Please try again later",
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
          {otpValidated ? (
            <form onSubmit={(e) => handleResetPassword(e)}>
              <div className="space-y-4 flex flex-col">
                <div>
                  <Label htmlFor="password" className="block mb-2">
                    Enter New Password
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={true}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password" className="block mb-2">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={true}
                    className="w-full"
                  />
                </div>
                <div className="w-full flex justify-center">
                  <div className="min-w-32 w-[70%]">
                    <SubmitButton btnText="Reset Password" />
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={(e) => handleSubmitOtp(e)}>
              <Label className="width-full flex justify-center">
                Check your email for a one time code.
              </Label>
              <div className="space-y-4 flex flex-col items-center">
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
                <div className="min-w-32 w-[70%]">
                  <SubmitButton btnText="Enter" />
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
