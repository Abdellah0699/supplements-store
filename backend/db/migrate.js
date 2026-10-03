/**
 * migrate.js
 * ---------------------------------------------------------
 * A small, dependency-free migration runner:
 *  - reads every .sql file in db/migrations, in filename order
 *  - skips ones already recorded in schema_migrations
 *  - runs each new one inside its own transaction
 * Run with: npm run migrate
 * ---------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations() {
  const result = await pool.query('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map((r) => r.filename));
}

async function runMigrations() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let ranCount = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[migrate] skip  ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`[migrate] applied ${file}`);
      ranCount += 1;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[migrate] FAILED on ${file}:`, err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log(`[migrate] done - ${ranCount} new migration(s) applied, ${files.length} total.`);
}

runMigrations()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    pool.end().finally(() => process.exit(1));
  });
