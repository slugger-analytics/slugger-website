/**
 * API functions for team admin management
 * Handles fetching, approving, declining, and revoking team admin permissions
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Fetches all pending team admin requests
 * @returns Array of pending team admin requests
 * @throws Error if the request fails
 */
export const fetchPendingTeamAdmins = async () => {
  const response = await fetch(`${API_URL}/api/team-admins/pending`, {
    credentials: "include",
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message);
  }
  return data.data;
};

/**
 * Approves a team admin request
 * Sets the user's is_admin flag to true and removes the request
 * @param requestId - The ID of the request to approve
 * @returns Success response with updated user data
 * @throws Error if the request fails or has already been processed
 */
export const approveTeamAdmin = async (requestId: number) => {
  const response = await fetch(
    `${API_URL}/api/team-admins/pending/${requestId}/approve`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    },
  );

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message);
  }
  return data;
};

/**
 * Declines a team admin request
 * Removes the request without granting permissions
 * @param requestId - The ID of the request to decline
 * @returns Success response
 * @throws Error if the request fails or has already been processed
 */
export const declineTeamAdmin = async (requestId: number) => {
  const response = await fetch(
    `${API_URL}/api/team-admins/pending/${requestId}/decline`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    },
  );

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message);
  }
  return data;
};

/**
 * Fetches all team admins across all teams
 * Maps backend response to TeamMember format for consistency
 * @returns Array of team admins in TeamMember format
 * @throws Error if the request fails
 */
export const fetchAllTeamAdmins = async () => {
  const response = await fetch(`${API_URL}/api/team-admins`, {
    credentials: "include",
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message);
  }

  // Map backend response to TeamMember format
  // Backend returns first_name/last_name, but TeamMember uses first/last
  return data.data.map((admin: any) => ({
    user_id: admin.user_id.toString(),
    first: admin.first_name,
    last: admin.last_name,
    email: admin.email,
    is_admin: admin.is_admin,
    team_role: "", // Not provided by backend for team admins
    team_id: admin.team_id.toString(),
    team_name: admin.team_name,
  }));
};

/**
 * Revokes team admin permissions from a user
 * Sets the user's is_admin flag to false
 * @param userId - The ID of the user to revoke permissions from
 * @returns Success response with updated user data
 * @throws Error if the user is not found or is not a team admin
 */
export const revokeTeamAdminPermissions = async (userId: string) => {
  const response = await fetch(`${API_URL}/api/team-admins/${userId}`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.message);
  }
  return data;
};
