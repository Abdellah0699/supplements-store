/**
 * database.js
 * ---------------------------------------------------------
 * A single shared PostgreSQL connection pool, plus two small
 * helpers used everywhere else in the app:
 *   - query(text, params): a plain parameterized query
 *   - withTransaction(fn): runs fn(client) inside BEGIN/COMMIT,
 *     rolling back automatically if fn throws
 * No other file should import `pg` directly - this keeps the
 * connection handling in one place.
 * ---------------------------------------------------------
 */

const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

pool.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[db] Unexpected error on idle client', err);
});

async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Runs `fn` with a dedicated client inside a transaction.
 * `fn` receives the client and must use it for every query it
 * makes (not the pool) so all statements share the same transaction.
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function checkConnection() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = { pool, query, withTransaction, checkConnection };
