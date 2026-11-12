import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const migrationPath = path.resolve(__dirname, '../../sql/migrations/004_care_and_delivery_system.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Split by semicolon followed by newline
  const rawStatements = sql
    .replace(/\r\n/g, '\n')
    .split(/;\s*\n/);

  const statements = rawStatements
    .map(s => {
      // Remove lines starting with --
      return s
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .trim();
    })
    .filter(s => s.length > 0 && !s.toUpperCase().startsWith('USE'));

  console.log(`Parsed ${statements.length} migration statements.`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`[${i + 1}/${statements.length}] Executing: ${stmt.substring(0, 50).replace(/\n/g, ' ')}...`);
    try {
      await pool.query(stmt);
      console.log(`✓ Statement ${i + 1} succeeded.`);
    } catch (err) {
      console.error(`✗ Statement ${i + 1} failed:`, err.message);
      console.error(stmt);
      throw err;
    }
  }

  console.log('Migration 004 applied successfully!');
  await pool.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
