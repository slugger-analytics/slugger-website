import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function generateOTP(length: number) {
  const digits = '0123456789';
  let res = "";
  for (let i = 0; i < length; ++i) {
    res += digits[Math.floor(Math.random() * length)];
  }
  return res;
}

