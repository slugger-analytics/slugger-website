import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const { default: pool } = await import('./db.js');

async function testPlayerQuery() {
  try {
    // Check if player table exists
    const check = await pool.query(
      `SELECT to_regclass($1) IS NOT NULL AS exists`,
      ['player']
    );
    console.log('Player table exists:', check.rows[0].exists);

    if (check.rows[0].exists) {
      // Get table structure
      const struct = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'player' 
        ORDER BY ordinal_position
      `);
      console.log('\nPlayer table structure:');
      struct.rows.forEach(r => {
        console.log(`  - ${r.column_name}: ${r.data_type}`);
      });

      // Count rows
      const count = await pool.query('SELECT COUNT(*) FROM player');
      console.log(`\nTotal players: ${count.rows[0].count}`);

      // Get sample rows
      if (parseInt(count.rows[0].count) > 0) {
        const sample = await pool.query('SELECT * FROM player LIMIT 2');
        console.log('\nSample players:');
        sample.rows.forEach((r, i) => {
          console.log(`\nPlayer ${i + 1}:`);
          Object.entries(r).forEach(([k, v]) => {
            console.log(`  ${k}: ${v}`);
          });
        });
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

testPlayerQuery();
