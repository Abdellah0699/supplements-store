/**
 * env.js
 * ---------------------------------------------------------
 * Loads and validates environment variables in one place, so
 * the rest of the app never touches process.env directly.
 * ---------------------------------------------------------
 */

require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: required('DATABASE_URL'),
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5500',
  isProduction: (process.env.NODE_ENV || 'development') === 'production',

  // --- Phase 4: admin authentication ---
  // AUTH_SECRET signs the admin JWTs. Required in production; in
  // development a fallback is used with a loud warning (never rely
  // on it beyond local dev).
  AUTH_SECRET: (() => {
    const s = process.env.AUTH_SECRET;
    if (s) return s;
    if ((process.env.NODE_ENV || 'development') === 'production') {
      throw new Error('Missing required environment variable: AUTH_SECRET');
    }
    console.warn('[env] WARNING: AUTH_SECRET is not set - using an insecure development fallback.');
    return 'dev-only-insecure-secret-change-me';
  })(),
  // How long an admin stays logged in (seconds). 12h covers a workday.
  AUTH_TOKEN_TTL_SECONDS: parseInt(process.env.AUTH_TOKEN_TTL_SECONDS || '43200', 10),
  // Cookie SameSite mode: 'lax' (default, same-site frontends) or
  // 'none' (cross-site frontend - requires Secure, i.e. HTTPS).
  AUTH_COOKIE_SAMESITE: (process.env.AUTH_COOKIE_SAMESITE || 'lax').toLowerCase(),
  // First-admin seed credentials (only used by `npm run seed`).
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || '',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',

  // --- Product image storage (Supabase Storage) ---
  // When SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are both set,
  // product image uploads go to the Supabase Storage bucket below
  // and survive restarts/redeploys. When unset, uploads fall back
  // to local disk (backend/uploads/) - fine for development only.
  // The bucket must be public (or have a public read policy) so the
  // customer site can display the images.
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'product-images',
};

module.exports = env;
