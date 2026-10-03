/**
 * auth.middleware.js
 * ---------------------------------------------------------
 * Phase 4: protects the /api/admin/* endpoints.
 * Reads the JWT from the HttpOnly `admin_session` cookie, verifies
 * it, and attaches the admin identity to req.admin. Anything without
 * a valid token gets a 401 - the backend is the security authority,
 * never the frontend's word for it.
 * ---------------------------------------------------------
 */

const AppError = require('../utils/app-error');
const { verifyToken, findAdminByUsername } = require('../services/admin-auth.service');

const COOKIE_NAME = 'admin_session';

function getTokenFromRequest(req) {
  return req.cookies ? req.cookies[COOKIE_NAME] : undefined;
}

async function requireAdmin(req, res, next) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) throw AppError.unauthorized();

    const payload = verifyToken(token);
    if (!payload || !payload.sub) throw AppError.unauthorized();

    // The account may have been deactivated after the token was issued.
    const row = await findAdminByUsername(payload.username);
    if (!row || !row.is_active || row.id !== payload.sub) {
      throw AppError.unauthorized();
    }

    req.admin = { id: row.id, username: row.username, role: row.role };
    next();
  } catch (err) {
    next(err instanceof AppError ? err : AppError.unauthorized());
  }
}

module.exports = { requireAdmin, COOKIE_NAME, getTokenFromRequest };
