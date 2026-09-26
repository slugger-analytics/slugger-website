/**
 * Password-reset OTP rules (server-generated code, hashed storage, lockout).
 *
 * Run: node --test backend/test/password-reset.test.js
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  GENERIC_RESET_REQUEST_MESSAGE,
  MAX_OTP_ATTEMPTS,
  OTP_LENGTH,
  RESEND_COOLDOWN_MS,
  evaluateOtpAttempt,
  generateNumericOtp,
  hashOtp,
  isOtpExpired,
  isOtpLocked,
  isResendCooldownActive,
  isValidResetEmail,
  normalizeResetEmail,
  otpsMatch,
  shouldSendResetEmail,
} from "../lib/passwordReset.js";

const SECRET = "test-reset-secret";
const EMAIL = "user@example.com";

describe("normalizeResetEmail / isValidResetEmail", () => {
  test("trims and lowercases", () => {
    assert.equal(normalizeResetEmail("  Foo@Example.COM "), "foo@example.com");
  });

  test("rejects missing or malformed emails", () => {
    assert.equal(isValidResetEmail(""), false);
    assert.equal(isValidResetEmail("not-an-email"), false);
    assert.equal(isValidResetEmail("ok@example.com"), true);
  });
});

describe("generateNumericOtp", () => {
  test("returns a zero-padded digit string of the requested length", () => {
    for (let i = 0; i < 50; i += 1) {
      const otp = generateNumericOtp();
      assert.match(otp, /^\d+$/);
      assert.equal(otp.length, OTP_LENGTH);
    }
  });
});

describe("hashOtp / otpsMatch", () => {
  test("same email+otp+secret hashes match", () => {
    const otp = "123456";
    const digest = hashOtp(EMAIL, otp, SECRET);
    assert.equal(otpsMatch(digest, EMAIL, otp, SECRET), true);
  });

  test("wrong otp, email, or secret do not match", () => {
    const digest = hashOtp(EMAIL, "123456", SECRET);
    assert.equal(otpsMatch(digest, EMAIL, "000000", SECRET), false);
    assert.equal(otpsMatch(digest, "other@example.com", "123456", SECRET), false);
    assert.equal(otpsMatch(digest, EMAIL, "123456", "other-secret"), false);
  });
});

describe("shouldSendResetEmail", () => {
  test("does not send for unknown accounts", () => {
    assert.deepEqual(
      shouldSendResetEmail({ userExists: false, existingRow: null }),
      { send: false, reason: "unknown_user" }
    );
  });

  test("respects resend cooldown for existing tokens", () => {
    const now = new Date("2026-08-20T12:00:00.000Z");
    const existingRow = {
      created_at: new Date(now.getTime() - RESEND_COOLDOWN_MS + 1000),
    };
    assert.deepEqual(
      shouldSendResetEmail({ userExists: true, existingRow, now }),
      { send: false, reason: "cooldown" }
    );
  });

  test("sends when the account exists and cooldown has elapsed", () => {
    const now = new Date("2026-08-20T12:00:00.000Z");
    const existingRow = {
      created_at: new Date(now.getTime() - RESEND_COOLDOWN_MS - 1000),
    };
    assert.deepEqual(
      shouldSendResetEmail({ userExists: true, existingRow, now }),
      { send: true, reason: "ok" }
    );
  });
});

describe("evaluateOtpAttempt", () => {
  const now = new Date("2026-08-20T12:00:00.000Z");
  const otp = "654321";
  const validRow = {
    otp_hash: hashOtp(EMAIL, otp, SECRET),
    expires_at: new Date(now.getTime() + 60_000),
    attempts: 0,
  };

  test("missing row is not a match and does not increment", () => {
    assert.deepEqual(
      evaluateOtpAttempt({ row: null, email: EMAIL, otp, secret: SECRET, now }),
      { ok: false, reason: "missing", incrementAttempts: false }
    );
  });

  test("expired row is not a match", () => {
    assert.equal(isOtpExpired(new Date(now.getTime() - 1), now), true);
    assert.deepEqual(
      evaluateOtpAttempt({
        row: { ...validRow, expires_at: new Date(now.getTime() - 1) },
        email: EMAIL,
        otp,
        secret: SECRET,
        now,
      }),
      { ok: false, reason: "expired", incrementAttempts: false }
    );
  });

  test("locked row is not a match", () => {
    assert.equal(isOtpLocked(MAX_OTP_ATTEMPTS), true);
    assert.deepEqual(
      evaluateOtpAttempt({
        row: { ...validRow, attempts: MAX_OTP_ATTEMPTS },
        email: EMAIL,
        otp,
        secret: SECRET,
        now,
      }),
      { ok: false, reason: "locked", incrementAttempts: false }
    );
  });

  test("wrong otp increments attempts", () => {
    assert.deepEqual(
      evaluateOtpAttempt({
        row: validRow,
        email: EMAIL,
        otp: "000000",
        secret: SECRET,
        now,
      }),
      { ok: false, reason: "invalid", incrementAttempts: true }
    );
  });

  test("matching unexpired otp succeeds", () => {
    assert.deepEqual(
      evaluateOtpAttempt({
        row: validRow,
        email: EMAIL,
        otp,
        secret: SECRET,
        now,
      }),
      { ok: true }
    );
  });
});

describe("isResendCooldownActive", () => {
  test("false when there is no previous send", () => {
    assert.equal(isResendCooldownActive(null), false);
  });
});

describe("public copy", () => {
  test("request message does not reveal whether the account exists", () => {
    assert.match(GENERIC_RESET_REQUEST_MESSAGE, /if an account exists/i);
  });
});
