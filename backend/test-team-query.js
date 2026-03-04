import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const { default: pool } = await import('./db.js');

try {
  const result = await pool.query('SELECT COUNT(*) AS cnt FROM team');
  console.log('Team count:', result.rows[0].cnt);
  const sample = await pool.query('SELECT team_id, team_name FROM team LIMIT 5');
  console.log('Sample teams:', sample.rows);
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await pool.end();
}
