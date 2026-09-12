/**
 * Pure helpers for the password-reset OTP flow.
 * OTP generation, hashing, and attempt rules live here so they can be tested
 * without Cognito, SES, or Postgres.
 */
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const MAX_OTP_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 60 * 1000;

export const GENERIC_RESET_REQUEST_MESSAGE =
  "If an account exists for that email, a reset code has been sent.";
export const GENERIC_INVALID_CODE_MESSAGE = "Invalid or expired reset code.";

export function normalizeResetEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isValidResetEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function generateNumericOtp(length = OTP_LENGTH) {
  const max = 10 ** length;
  return String(randomInt(max)).padStart(length, "0");
}

export function hashOtp(email, otp, secret) {
  if (!secret) {
    throw new Error("Missing password reset secret");
  }
  return createHmac("sha256", secret).update(`${email}:${otp}`).digest("hex");
}

export function otpHashesEqual(left, right) {
  const a = Buffer.from(String(left), "utf8");
  const b = Buffer.from(String(right), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function otpsMatch(storedHash, email, otp, secret) {
  try {
    return otpHashesEqual(storedHash, hashOtp(email, otp, secret));
  } catch {
    return false;
  }
}

export function isOtpExpired(expiresAt, now = new Date()) {
  return new Date(expiresAt).getTime() <= now.getTime();
}

export function isResendCooldownActive(
  createdAt,
  now = new Date(),
  cooldownMs = RESEND_COOLDOWN_MS
) {
  if (!createdAt) return false;
  return now.getTime() - new Date(createdAt).getTime() < cooldownMs;
}

export function isOtpLocked(attempts, maxAttempts = MAX_OTP_ATTEMPTS) {
  return Number(attempts) >= maxAttempts;
}

/**
 * Decide whether a new reset email should actually be sent.
 * Unknown accounts and cooldown windows still return the same public message.
 */
export function shouldSendResetEmail({ userExists, existingRow, now = new Date() }) {
  if (!userExists) {
    return { send: false, reason: "unknown_user" };
  }
  if (existingRow && isResendCooldownActive(existingRow.created_at, now)) {
    return { send: false, reason: "cooldown" };
  }
  return { send: true, reason: "ok" };
}

/**
 * Evaluate a submitted OTP against a stored reset row.
 * @returns {{ ok: true } | { ok: false, reason: "missing"|"expired"|"locked"|"invalid", incrementAttempts: boolean }}
 */
export function evaluateOtpAttempt({ row, email, otp, secret, now = new Date() }) {
  if (!row) {
    return { ok: false, reason: "missing", incrementAttempts: false };
  }
  if (isOtpExpired(row.expires_at, now)) {
    return { ok: false, reason: "expired", incrementAttempts: false };
  }
  if (isOtpLocked(row.attempts)) {
    return { ok: false, reason: "locked", incrementAttempts: false };
  }
  if (!otpsMatch(row.otp_hash, email, otp, secret)) {
    return { ok: false, reason: "invalid", incrementAttempts: true };
  }
  return { ok: true };
}
