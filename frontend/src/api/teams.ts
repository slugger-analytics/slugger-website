import { TeamMember } from "@/data/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Team {
  team_id: string;
  team_name: string;
}

export async function getTeams(): Promise<Team[]> {
  try {
    const response = await fetch(`${API_URL}/api/teams`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching teams:", error);
    throw error;
  }
}

export async function getTeam(teamId: string): Promise<Team> {
  try {
    const response = await fetch(`${API_URL}/api/teams/${teamId}`);
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching team:", error);
    throw error;
  }
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  try {
    const response = await fetch(`${API_URL}/api/teams/${teamId}/members`, {
      credentials: "include",
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching team members:", error);
    throw error;
  }
}

export async function promoteTeamMember(
  teamId: string,
  memberId: number,
): Promise<TeamMember> {
  try {
    const response = await fetch(
      `${API_URL}/api/teams/${teamId}/members/${memberId}/promote`,
      {
        method: "POST",
        credentials: "include",
      },
    );
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    return data.data;
  } catch (error) {
    console.error("Error promoting team member:", error);
    throw error;
  }
}

export async function demoteTeamMember(
  teamId: string,
  memberId: number,
): Promise<TeamMember> {
  try {
    const response = await fetch(
      `${API_URL}/api/teams/${teamId}/members/${memberId}/demote`,
      {
        method: "POST",
        credentials: "include",
      },
    );
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    return data.data;
  } catch (error) {
    console.error("Error demoting team member:", error);
    throw error;
  }
}

export async function removeTeamMember(
  teamId: string,
  memberId: number,
): Promise<void> {
  try {
    const response = await fetch(
      `${API_URL}/api/teams/${teamId}/members/${memberId}`,
      {
        method: "DELETE",
        credentials: "include",
      },
    );
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error("Error removing team member:", error);
    throw error;
  }
}

export async function updateMemberRole(
  teamId: string,
  memberId: number,
  role: string,
): Promise<TeamMember> {
  try {
    const response = await fetch(
      `${API_URL}/api/teams/${teamId}/members/${memberId}/role`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      },
    );
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    return data.data;
  } catch (error) {
    console.error("Error updating member role:", error);
    throw error;
  }
}
