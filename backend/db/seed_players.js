import pool from '../db.js';

async function seed() {
  try {
    console.log('Creating players table (players_test) if not exists...');
    const createSql = `
      CREATE TABLE IF NOT EXISTS players_test (
        player_id TEXT PRIMARY KEY,
        player_name TEXT,
        team_name TEXT,
        position TEXT,
        avg NUMERIC(5,3),
        hr INTEGER,
        rbi INTEGER,
        runs INTEGER,
        hits INTEGER,
        sb INTEGER,
        era NUMERIC(4,2),
        so INTEGER,
        ip NUMERIC(6,2),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    await pool.query(createSql);

    console.log('Inserting sample players into players_test...');
    const insertSql = `
      INSERT INTO players_test (player_id, player_name, team_name, position, avg, hr, rbi, runs, hits, sb)
      VALUES
        ('101', 'Shohei Ohtani', 'Los Angeles Dodgers', 'OF', 0.310, 28, 95, 80, 150, 10),
        ('102', 'Mookie Betts', 'Los Angeles Dodgers', 'OF', 0.295, 22, 85, 70, 140, 8)
      ON CONFLICT (player_id) DO UPDATE
      SET player_name = EXCLUDED.player_name,
          team_name = EXCLUDED.team_name;

      INSERT INTO players_test (player_id, player_name, team_name, position, era, so, ip)
      VALUES
        ('150', 'Clayton Kershaw', 'Los Angeles Dodgers', 'P', 2.45, 180, 190.2)
      ON CONFLICT (player_id) DO UPDATE
      SET player_name = EXCLUDED.player_name,
          team_name = EXCLUDED.team_name;
    `;

    await pool.query(insertSql);

    const res = await pool.query('SELECT player_id, player_name, team_name, position, avg, hr, era, so FROM players_test ORDER BY player_id');
    console.log('Sample rows:');
    console.table(res.rows);

    console.log('Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding players:', err.message || err);
    process.exit(1);
  }
}

seed();
