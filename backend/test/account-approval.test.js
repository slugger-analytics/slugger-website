/**
 * Account approval infra tests (developer signup → confirm → admin approve).
 *
 * Run: node --test backend/test/account-approval.test.js
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  resolvePendingDeveloperStatus,
  shouldBlockLoginForPendingDeveloper,
  parseApprovalRequestId,
  isVisibleToAdminPendingList,
  confirmSignupMarkedDeveloper,
  mapApprovalServiceError,
} from "../lib/accountApproval.js";
import { requireSiteAdmin } from "../middleware/permission-guards.js";

describe("resolvePendingDeveloperStatus (GET /auth/check-status/:email)", () => {
  test("no pending row → regular_user", () => {
    assert.equal(resolvePendingDeveloperStatus(null), "regular_user");
    assert.equal(resolvePendingDeveloperStatus(undefined), "regular_user");
  });

  test("registered developer, email not confirmed → pending_confirmation", () => {
    assert.equal(
      resolvePendingDeveloperStatus({ email_confirmed: false }),
      "pending_confirmation"
    );
  });

  test("email confirmed, awaiting admin → pending_approval", () => {
    assert.equal(
      resolvePendingDeveloperStatus({ email_confirmed: true }),
      "pending_approval"
    );
  });
});

describe("shouldBlockLoginForPendingDeveloper (POST /users/sign-in)", () => {
  test("existing users table row → allow login path", () => {
    assert.equal(
      shouldBlockLoginForPendingDeveloper({ userExists: true, pendingDeveloperExists: true }),
      false
    );
  });

  test("no users row but pending_developers row → block with 403", () => {
    assert.equal(
      shouldBlockLoginForPendingDeveloper({ userExists: false, pendingDeveloperExists: true }),
      true
    );
  });

  test("neither users nor pending → auto-create user path", () => {
    assert.equal(
      shouldBlockLoginForPendingDeveloper({ userExists: false, pendingDeveloperExists: false }),
      false
    );
  });
});

describe("parseApprovalRequestId (POST /developers/pending/:id/approve|decline)", () => {
  test("accepts positive integers", () => {
    assert.equal(parseApprovalRequestId("42"), 42);
    assert.equal(parseApprovalRequestId("1"), 1);
  });

  test("rejects invalid ids", () => {
    assert.equal(parseApprovalRequestId("0"), null);
    assert.equal(parseApprovalRequestId("-1"), null);
    assert.equal(parseApprovalRequestId("abc"), null);
    assert.equal(parseApprovalRequestId(""), null);
    assert.equal(parseApprovalRequestId(undefined), null);
  });
});

describe("isVisibleToAdminPendingList (GET /developers/pending)", () => {
  test("only email_confirmed + status pending appear in admin queue", () => {
    assert.equal(
      isVisibleToAdminPendingList({ status: "pending", email_confirmed: true }),
      true
    );
    assert.equal(
      isVisibleToAdminPendingList({ status: "pending", email_confirmed: false }),
      false
    );
    assert.equal(
      isVisibleToAdminPendingList({ status: "approved", email_confirmed: true }),
      false
    );
  });
});

describe("requireSiteAdmin (approval APIs require role=admin)", () => {
  function runGuard(sessionUser) {
    const req = { session: sessionUser ? { user: sessionUser } : {} };
    let statusCode;
    let body;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        body = payload;
        return this;
      },
    };
    let nextCalled = false;
    requireSiteAdmin(req, res, () => {
      nextCalled = true;
    });
    return { statusCode, body, nextCalled };
  }

  test("admin session passes", () => {
    const { nextCalled, statusCode } = runGuard({ role: "admin", user_id: 1 });
    assert.equal(nextCalled, true);
    assert.equal(statusCode, undefined);
  });

  test("non-admin gets 403", () => {
    const { nextCalled, statusCode, body } = runGuard({ role: "league", user_id: 2 });
    assert.equal(nextCalled, false);
    assert.equal(statusCode, 403);
    assert.equal(body.success, false);
    assert.match(body.message, /admin/i);
  });

  test("unauthenticated gets 403", () => {
    const { nextCalled, statusCode } = runGuard(null);
    assert.equal(nextCalled, false);
    assert.equal(statusCode, 403);
  });
});

describe("approveDeveloper transaction order (documented infra contract)", () => {
  test("approval steps: enable Cognito → create user → API key → delete pending → email (best-effort)", () => {
    const expectedSteps = [
      "adminEnableUser",
      "createUser",
      "generateApiKeyForUser",
      "delete pending_developers",
      "sendApiKeyEmail (best-effort, after commit)",
    ];
    assert.deepEqual(expectedSteps, [
      "adminEnableUser",
      "createUser",
      "generateApiKeyForUser",
      "delete pending_developers",
      "sendApiKeyEmail (best-effort, after commit)",
    ]);
  });
});

describe("confirmSignupMarkedDeveloper (POST /auth/confirm-signup)", () => {
  test("returns true when pending_developers row was updated", () => {
    assert.equal(confirmSignupMarkedDeveloper(1), true);
    assert.equal(confirmSignupMarkedDeveloper(0), false);
  });
});

describe("mapApprovalServiceError (admin approve/decline APIs)", () => {
  test("maps known service errors to HTTP status", () => {
    assert.deepEqual(mapApprovalServiceError(new Error("Pending developer not found")), {
      status: 404,
      message: "Pending developer not found",
    });
    assert.deepEqual(
      mapApprovalServiceError(new Error("Failed to generate API key: no ID")),
      { status: 502, message: "Developer enabled but API key generation failed." }
    );
  });

  test("returns null for unknown errors", () => {
    assert.equal(mapApprovalServiceError(new Error("something else")), null);
  });
});
