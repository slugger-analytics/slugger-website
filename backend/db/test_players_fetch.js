import pool from '../db.js';

async function testFetch() {
  try {
    const res = await pool.query('SELECT player_id, player_name, team_name, position, avg, hr, rbi, era, so FROM players_test ORDER BY player_id');
    if (!res || !res.rows) {
      console.log('No rows returned from players_test.');
      process.exit(0);
    }

    console.log(`Fetched ${res.rows.length} player rows:`);
    res.rows.forEach(r => console.log(JSON.stringify(r)));
    process.exit(0);
  } catch (err) {
    console.error('Error fetching players from DB:', err.message || err);
    process.exit(2);
  }
}

testFetch();
