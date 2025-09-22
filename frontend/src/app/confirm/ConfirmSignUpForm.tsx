"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmSignUp, resendConfirmationCode } from "../../services/authService";
import SubmitButton from "../components/input/SubmitButton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";

// Component for confirming sign-up
export function ConfirmSignUpForm() {
  // State variables for email, confirmation code, and submission status
  const [email, setEmail] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [submitStatus, setSubmitStatus] = useState({
    message: "",
    textClass: "black",
  });
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const emailParam = searchParams.get("email");
    const typeParam = searchParams.get("type");

    if (emailParam) {
      setEmail(emailParam);
    }
    if (typeParam === "developer") {
      setIsDeveloper(true);
    }
  }, [searchParams]);

  // Handle resending confirmation code
  const handleResendCode = async () => {
    if (!email) {
      setSubmitStatus({
        message: "Please enter your email address first",
        textClass: "text-red-600",
      });
      return;
    }

    setIsResending(true);
    try {
      await resendConfirmationCode(email);
      setSubmitStatus({
        message: "Confirmation code resent! Please check your email.",
        textClass: "text-green-600",
      });
    } catch (error: unknown) {
      setSubmitStatus({
        message: error instanceof Error ? error.message : "Failed to resend confirmation code",
        textClass: "text-red-600",
      });
    } finally {
      setIsResending(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSubmitStatus({
      message: "",
      textClass: "text-black",
    });

    try {
      await confirmSignUp(email, confirmationCode);
      setSubmitStatus({
        message: isDeveloper ? "Email confirmed! Your account is now pending approval." : "Account confirmed! Redirecting to login...",
        textClass: "text-green-600",
      });
      setTimeout(() => router.push(isDeveloper ? "/pending-developer" : "/sign-in"), isDeveloper ? 2000 : 200);
    } catch (error: unknown) {
      // Update submission status on failure
      setSubmitStatus({
        message:
          error instanceof Error ? error.message : "Confirmation failed.",
        textClass: "text-red-600",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex items-center justify-center">
        <CardTitle>You&apos;re almost there</CardTitle>
        <CardDescription>
          Check your email for a confirmation code
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center w-80"
        >
          <div className="grid w-full items-center gap-4">
            {/* Input field for email */}
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="input-field"
              required
            />
            {/* Input field for confirmation code */}
            <Input
              type="text"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              placeholder="Enter confirmation code"
              className="input-field"
              required
            />
            {/* Submit button */}
            <SubmitButton btnText="Confirm Sign Up" />
            
            {/* Resend code button */}
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={handleResendCode}
                disabled={isResending || !email}
                className="w-full"
              >
                {isResending ? "Resending..." : "Resend Confirmation Code"}
              </Button>
            </div>
            
            {/* Display submission status message */}
            <div className="flex justify-center text-sm">
              <p
                className={`my-2 ${submitStatus.textClass}`}
                role="status"
                aria-live="polite"
              >
                {submitStatus.message}
              </p>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
