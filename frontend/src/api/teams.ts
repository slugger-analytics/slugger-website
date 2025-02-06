const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Team {
  team_id: string;
  team_name: string;
}

interface TeamMember {
  user_id: string;
  first: string;
  last: string;
  email: string;
  is_admin: boolean;
  team_role: string;
  teamId: string;
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
    console.error('Error fetching teams:', error);
    throw error;
  }
}

export async function getTeam(teamId: string): Promise<Team> {
  try {
    const response = await fetch(`${API_URL}/api/teams/${teamId}`);
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching team:', error);
    throw error;
  }
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  try {
    const response = await fetch(`${API_URL}/api/teams/${teamId}/members`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching team members:', error);
    throw error;
  }
}

export async function promoteTeamMember(teamId: string, memberId: number): Promise<TeamMember> {
  try {
    const response = await fetch(`${API_URL}/api/teams/${teamId}/members/${memberId}/promote`, {
      method: 'POST',
    });
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    return data.data;
  } catch (error) {
    console.error('Error promoting team member:', error);
    throw error;
  }
}

export async function removeTeamMember(teamId: string, memberId: number): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/api/teams/${teamId}/members/${memberId}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error removing team member:', error);
    throw error;
  }
} 