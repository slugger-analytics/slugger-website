"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import InputField from "../components/input/InputField";
import SubmitButton from "../components/input/SubmitButton";
import { loginUser } from "../../api/auth";
import { useAuth } from "../contexts/AuthContext";

const LoginForm = () => {
  const [submitStatus, setSubmitStatus] = useState({
    message: "",
    textClass: "black",
  });
  const router = useRouter();
  const { userId, setUserId } = useAuth();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await loginUser(email, password);
      setUserId(result["user"]["user_id"]);

      // Handle successful login and redirect based on user role
      if (result.role === "master") {
        router.push("/pending-widgets");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      setSubmitStatus({
        message: "Login failed. Please try again.",
        textClass: "text-red-500",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center w-80">
      <InputField
        id="email"
        label="Email"
        type="email"
        required={true}
        placeholder="your@email.com"
      />
      <InputField
        id="password"
        label="Password"
        type="password"
        required={true}
      />
      <SubmitButton btnText="Sign in" />
      <p className={submitStatus.textClass}>{submitStatus.message}</p>
    </form>
  );
};

export default LoginForm;
