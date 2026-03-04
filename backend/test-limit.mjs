import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env.local") });

const pool = new Pool({
  user: process.env.DB_USER ?? process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
});

try {
  const result = await pool.query('SELECT * FROM player LIMIT 500');
  console.log(`Query returned ${result.rows.length} rows`);
  if (result.rows.length > 0) {
    console.log(`First row keys: ${Object.keys(result.rows[0]).join(', ')}`);
  }
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await pool.end();
}
