/**
 * admin-auth.controller.js
 * ---------------------------------------------------------
 * Phase 4: real admin authentication. The JWT goes into an
 * HttpOnly cookie (never into the response body, never into
 * localStorage) so frontend JavaScript can't read it.
 * ---------------------------------------------------------
 */

const env = require('../config/env');
const { verifyCredentials, issueToken } = require('../services/admin-auth.service');
const { COOKIE_NAME } = require('../middleware/auth.middleware');

function cookieOptions() {
  const sameSite = env.AUTH_COOKIE_SAMESITE === 'none' ? 'none' : 'lax';
  return {
    httpOnly: true,
    sameSite,
    // 'none' requires Secure; production always uses Secure.
    secure: sameSite === 'none' ? true : env.isProduction,
    path: '/',
    maxAge: env.AUTH_TOKEN_TTL_SECONDS * 1000,
  };
}

async function login(req, res) {
  const { username, password } = req.body; // validated by validateBody(adminLoginSchema)
  const admin = await verifyCredentials(username, password);
  const token = issueToken(admin);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  res.json({ success: true, data: { admin } });
}

async function logout(req, res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  res.json({ success: true, data: { loggedOut: true } });
}

/** Returns the currently authenticated admin (behind requireAdmin). */
async function session(req, res) {
  res.json({ success: true, data: { admin: req.admin } });
}

module.exports = { login, logout, session, cookieOptions };
