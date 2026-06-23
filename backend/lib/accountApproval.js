/**
 * Pure helpers for account approval flows (developer pending → admin approve).
 * Kept side-effect free so node:test can cover the infra rules without Cognito/DB.
 */

/**
 * Map a pending_developers row (or absence) to a public check-status value.
 * @param {{ email_confirmed?: boolean } | null | undefined} row
 * @returns {"regular_user" | "pending_confirmation" | "pending_approval"}
 */
export function resolvePendingDeveloperStatus(row) {
  if (!row) return "regular_user";
  return row.email_confirmed ? "pending_approval" : "pending_confirmation";
}

/**
 * Sign-in should 403 when Cognito auth succeeded but user is not in `users`
 * and still exists in `pending_developers`.
 */
export function shouldBlockLoginForPendingDeveloper({ userExists, pendingDeveloperExists }) {
  return !userExists && pendingDeveloperExists;
}

/**
 * Parse approve/decline route param (request_id).
 */
export function parseApprovalRequestId(param) {
  const id = parseInt(param, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * Admin pending list only shows email-confirmed developers awaiting approval.
 * Mirrors getPendingDevelopers SQL filter.
 */
export function isVisibleToAdminPendingList(row) {
  return row.status === "pending" && row.email_confirmed === true;
}

/**
 * After confirm-signup updates pending_developers, at least one row means developer signup.
 */
export function confirmSignupMarkedDeveloper(updateRowCount) {
  return updateRowCount > 0;
}

/**
 * Map known approval-service errors to HTTP responses for admin APIs.
 * Returns null when the error should fall through to a generic 500.
 */
export function mapApprovalServiceError(error) {
  const message = error?.message ?? "";
  if (message === "Pending developer not found") {
    return { status: 404, message };
  }
  if (message.startsWith("Failed to disable Cognito account")) {
    return { status: 502, message: "Could not update Cognito account status." };
  }
    if (message.startsWith("Failed to generate API key")) {
    return { status: 502, message: "Developer enabled but API key generation failed." };
  }
  return null;
}
