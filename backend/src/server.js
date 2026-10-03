/**
 * server.js
 * Entry point: verifies the database is reachable, then starts
 * listening. Run with: npm start (or npm run dev for auto-reload).
 */

const app = require('./app');
const env = require('./config/env');
const { checkConnection } = require('./config/database');

async function start() {
  const dbOk = await checkConnection();
  if (!dbOk) {
    // eslint-disable-next-line no-console
    console.error('[server] Could not connect to the database. Check DATABASE_URL in .env.');
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log('[server] Database connection OK.');

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] Listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    // eslint-disable-next-line no-console
    console.log(`[server] API base: http://localhost:${env.PORT}/api`);
  });
}

start();
