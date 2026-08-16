import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const __dir = dirname(fileURLToPath(import.meta.url));

export async function initDb() {
  const sql = readFileSync(join(__dir, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

export default pool;
