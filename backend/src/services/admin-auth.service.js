/**
 * admin-auth.service.js
 * ---------------------------------------------------------
 * Phase 4: admin credential checking and token issuance.
 * Passwords are verified with bcrypt against password_hash;
 * the plaintext password never leaves this function and the
 * hash is never returned to callers.
 * ---------------------------------------------------------
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const env = require('../config/env');
const AppError = require('../utils/app-error');

const BCRYPT_ROUNDS = 12;

function publicAdmin(row) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

async function findAdminByUsername(username) {
  const { rows } = await query('SELECT * FROM admin_users WHERE username = $1', [username]);
  return rows[0] || null;
}

/**
 * Verifies credentials. On ANY failure (unknown user, inactive,
 * wrong password) throws the same generic 401 - the caller must
 * not reveal which part was wrong.
 */
async function verifyCredentials(username, password) {
  const row = await findAdminByUsername(username);
  // Always run a comparison (against a dummy hash when the user is
  // unknown) so timing doesn't leak whether the username exists.
  const hash = row ? row.password_hash : '$2b$12$.....................dummyhash.........................';
  let ok = false;
  try {
    ok = await bcrypt.compare(password, hash);
  } catch (e) {
    ok = false;
  }
  if (!row || !row.is_active || !ok) {
    throw AppError.unauthorized('Invalid username or password.');
  }
  return publicAdmin(row);
}

function issueToken(admin) {
  return jwt.sign(
    { sub: admin.id, username: admin.username, role: admin.role },
    env.AUTH_SECRET,
    { expiresIn: env.AUTH_TOKEN_TTL_SECONDS }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, env.AUTH_SECRET);
  } catch (e) {
    return null;
  }
}

async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

module.exports = { publicAdmin, findAdminByUsername, verifyCredentials, issueToken, verifyToken, hashPassword };
