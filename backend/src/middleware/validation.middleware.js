/**
 * validation.middleware.js
 * Two things live here:
 *  - asyncHandler: wraps an async route handler so a rejected promise
 *    (or a thrown error) is forwarded to next() instead of being
 *    swallowed or crashing the process.
 *  - validateQuery/validateBody: parse req.query/req.body against a
 *    Zod schema (via utils/validation.parseOrThrow) and replace them
 *    with the parsed, typed result.
 */

const { parseOrThrow } = require('../utils/validation');

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = parseOrThrow(schema, req.query);
      next();
    } catch (err) {
      next(err);
    }
  };
}

function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = parseOrThrow(schema, req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { asyncHandler, validateQuery, validateBody };
