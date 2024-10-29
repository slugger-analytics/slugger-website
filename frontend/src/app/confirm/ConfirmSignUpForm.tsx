"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmSignUp } from "../../services/authService"; // You'll implement this function
import SubmitButton from "../components/input/SubmitButton";

export function ConfirmSignUpForm() {
  const [email, setEmail] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [submitStatus, setSubmitStatus] = useState({
    message: "",
    textClass: "black",
  });
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      // Call the confirmSignUp function to verify the account
      await confirmSignUp(email, confirmationCode);
      setSubmitStatus({
        message: "Account confirmed! Redirecting to login...",
        textClass: "text-green-500",
      });
      setTimeout(() => router.push("/sign-in"), 200); // Redirect to login after successful confirmation
    } catch (error: unknown) {
      setSubmitStatus({
        message:
          error instanceof Error ? error.message : "Confirmation failed.",
        textClass: "text-red-500",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center w-80">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="input-field"
        required
      />
      <input
        type="text"
        value={confirmationCode}
        onChange={(e) => setConfirmationCode(e.target.value)}
        placeholder="Enter confirmation code"
        className="input-field"
        required
      />
      <SubmitButton btnText="Confirm Sign Up" />
      <p
        aria-live="polite"
        className={`mb-2 ${submitStatus.textClass}`}
        role="status"
      >
        {submitStatus.message}
      </p>
    </form>
  );
}
