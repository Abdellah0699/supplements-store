/**
 * rate-limit.middleware.js
 * A general limiter for the whole API, and a stricter one just for
 * order creation (the endpoint that writes to the database and is
 * the most worth protecting from abuse/spam).
 */

const rateLimit = require('express-rate-limit');

// Rate limiting is about protecting a real deployment from abuse - it
// would only get in the way of the automated test suite hitting the
// same endpoints many times in a few seconds, so it's relaxed under
// NODE_ENV=test rather than skipped silently in production too.
const isTest = process.env.NODE_ENV === 'test';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 10000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again shortly.' },
  },
});

const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: isTest ? 10000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many orders submitted. Please wait a few minutes and try again.' },
  },
});

// Phase 4: strict limiter for the admin login endpoint - slows down
// brute-force attempts without locking out a legitimate admin who
// mistypes a few times (20 tries per 15 minutes).
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 10000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Please try again shortly.' },
  },
});

module.exports = { apiLimiter, orderLimiter, loginLimiter };
