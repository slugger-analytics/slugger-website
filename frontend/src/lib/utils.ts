import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { clearUserStore } from "./userStore";
import { clearWidgetStore } from "./widgetStore";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateOTP(length: number) {
  const digits = "0123456789";
  let res = "";
  for (let i = 0; i < length; ++i) {
    res += digits[Math.floor(Math.random() * length)];
  }
  return res;
}

// Add password validation function
export const validatePassword = (
  password: string,
): { isValid: boolean; error: string } => {
  if (password.length < 8) {
    return {
      isValid: false,
      error: "Password must be at least 8 characters long",
    };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one uppercase letter",
    };
  }
  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one lowercase letter",
    };
  }
  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one number",
    };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one symbol",
    };
  }
  return { isValid: true, error: "" };
};

export const clearStores = () => {
  clearUserStore();
  clearWidgetStore();
};
