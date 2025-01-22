import pool from "../db";

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
    const result = await pool.query(`SELECT * FROM team WHERE team_id = $1`, [
      id,
    ]);
    if (result.rowCount === 0) {
      throw new error(`Team with id ${id} not found`);
    }
    const team = result.rows[0];
    return team;
  } catch (error) {
    throw new error(error.message ?? `Error getting team with id ${id}`);
  }
}

export async function getTeamMembers(teamId) {
  try {
    const result = await pool.query(
      `
            SELECT *
            FROM users
            WHERE team_id = $1
        `,
      [teamId],
    );
    const members = result.rows;
    return members;
  } catch (error) {
    throw new error(
      error.message ?? `Error getting members for team with id ${teamId}`,
    );
  }
}

// TODO there is an error with this function - debug
export async function getTeamMember(teamId, memberId) {
  try {
    console.log("Debug 1")
    // error below
    const result = await pool.query(
      `
            SELECT *
            FROM users 
            WHERE role = league AND team_id = $1 AND user_id = $2`,
      [teamId, memberId],
    );
    console.log("Debug 2")
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
        const result = await pool.query(`
            UPDATE users
            SET team_id = $1
            WHERE user_id = $2
            RETURNING *
        `, [newTeamId, memberId])
        const updatedMember = result.rows[0];
        return updatedMember;
    } catch (error) {
        throw new error(
        error.message ?? `Error updating member's team`,
        );
    }
}
