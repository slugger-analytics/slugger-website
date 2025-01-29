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
    console.error('Error fetching teams:', error);
    throw error;
  }
} 