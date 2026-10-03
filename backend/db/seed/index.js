/**
 * index.js (seed runner)
 * Run with: npm run seed
 * Order matters: categories before products (FK), locations before
 * delivery fees (FK to wilayas).
 */

const { pool } = require('../../src/config/database');
const seedCategories = require('./categories.seed');
const seedProducts = require('./products.seed');
const seedLocations = require('./locations.seed');
const seedDeliveryFees = require('./delivery-fees.seed');
const seedAdminUser = require('./admin-user.seed');

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await seedCategories(client);
    await seedProducts(client);
    await seedLocations(client);
    await seedDeliveryFees(client);
    await seedAdminUser(client);
    await client.query('COMMIT');
    console.log('[seed] done - all seed data committed.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed] FAILED, rolled back:', err);
    throw err;
  } finally {
    client.release();
  }
}

run()
  .then(() => pool.end())
  .catch(() => pool.end().finally(() => process.exit(1)));
