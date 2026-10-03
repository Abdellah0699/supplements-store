/**
 * admin-user.seed.js
 * ---------------------------------------------------------
 * Creates (or updates) the FIRST admin account from environment
 * variables. The plaintext password is NEVER stored - it is
 * hashed with bcrypt before it touches the database, and it is
 * never printed to logs.
 *
 *   ADMIN_USERNAME=owner ADMIN_PASSWORD='...' npm run seed
 *
 * If the variables are absent the seed is skipped silently, so a
 * plain `npm run seed` keeps working for the customer data.
 * Re-running with the same username only refreshes the hash and
 * re-activates the account (handy for password rotation).
 * ---------------------------------------------------------
 */

const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;

async function seedAdminUser(client) {
  const username = (process.env.ADMIN_USERNAME || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!username || !password) {
    console.log('[seed] admin user: skipped (set ADMIN_USERNAME and ADMIN_PASSWORD to create one)');
    return;
  }
  if (password.length < 8) {
    throw new Error('[seed] admin user: ADMIN_PASSWORD must be at least 8 characters.');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await client.query(
    `INSERT INTO admin_users (username, password_hash, role, is_active)
     VALUES ($1, $2, 'admin', true)
     ON CONFLICT (username) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       is_active = true,
       updated_at = now()`,
    [username, passwordHash]
  );

  // Deliberately NOT logging the password.
  console.log(`[seed] admin user: upserted "${username}" (bcrypt hash stored, account active)`);
}

module.exports = seedAdminUser;
