import pool from "../db.js";

export async function getTeams() {
  try {
    const result = await pool.query(`SELECT * FROM team`);
    const teams = result.rows;
    return teams;
  } catch (error) {
    throw new error(error.message ?? `Error getting team`);
  }
}

export async function getTeam(id) {
  try {
    const result = await pool.query(
      `SELECT * FROM team WHERE team_id = $1`,
      [id]
    );
    if (result.rowCount === 0) {
      return null;
    }
    const team = result.rows[0];
    return team;
  } catch (error) {
    console.error('Error in getTeam:', error);
    throw new Error(`Error getting team with id ${id}`);
  }
}

export async function getTeamMembers(teamId) {
  try {
    const result = await pool.query(
      `
      SELECT * FROM users WHERE team_id = $1
      `,
      [teamId]
    );

    const members = result.rows.map(({ first_name, last_name, ...rest }) => ({
      first: first_name,
      last: last_name,
      ...rest,
    }));

    return members;
  } catch (error) {
    throw new Error(
      error.message ?? `Error getting members for team with id ${teamId}`
    );
  }
}

export async function getTeamMember(teamId, memberId) {
  try {
    const result = await pool.query(
      `
            SELECT *
            FROM users 
            WHERE role = 'league' AND team_id = $1 AND user_id = $2`,
      [teamId, memberId],
    );
    const member = result.rows[0];
    return member;
  } catch (error) {
    throw new error(
      error.message ?? `Error getting team member with id ${memberId}`,
    );
  }
}

export async function promoteTeamMember(teamId, memberId) {
  try {
    const result = await pool.query(
      `
            UPDATE users
            SET is_admin = true
            WHERE team_id = $1 AND user_id = $2
            RETURNING *`,
      [teamId, memberId],
    );
    const updatedMember = result.rows[0];
    return updatedMember;
  } catch (error) {
    throw new error(
      error.message ?? `Error promoting team member with id ${memberId}`,
    );
  }
}

export async function demoteTeamMember(teamId, memberId) {
  try {
    const result = await pool.query(
      `
            UPDATE users
            SET is_admin = false
            WHERE team_id = $1 AND user_id = $2
            RETURNING *`,
      [teamId, memberId],
    );
    const updatedMember = result.rows[0];
    return updatedMember;
  } catch (error) {
    throw new error(
      error.message ?? `Error demoting team member with id ${memberId}`,
    );
  }
}

export async function updateMemberTeam(newTeamId, memberId) {
  try {
    const result = await pool.query(
      `
            UPDATE users
            SET team_id = $1
            WHERE user_id = $2
            RETURNING *
        `,
      [newTeamId, memberId],
    );
    const updatedMember = result.rows[0];
    return updatedMember;
  } catch (error) {
    throw new error(error.message ?? `Error updating member's team`);
  }
}

export async function setClubhouseManager(teamId, memberId) {
  try {
    const result = await pool.query(
      `
            UPDATE users
            SET team_role = 'Clubhouse Manager'
            WHERE team_id = $1 AND user_id = $2
            RETURNING *`,
      [teamId, memberId],
    );
    const updatedMember = result.rows[0];
    return updatedMember;
  } catch (error) {
    throw new error(
      error.message ?? `Error setting clubhouse manager for member with id ${memberId}`,
    );
  }
}
