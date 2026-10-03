/**
 * error.middleware.js
 * Every route either calls next(err) or throws inside an async
 * handler wrapped by asyncHandler (see routes) - both end up here.
 * This is the ONLY place that decides what error detail reaches the
 * customer; stack traces and raw DB errors never do.
 */

const env = require('../config/env');
const AppError = require('../utils/app-error');

// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      // eslint-disable-next-line no-console
      console.error(`[error] ${req.method} ${req.originalUrl} ->`, err);
    }
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.fields ? { fields: err.fields } : {}),
      },
    });
  }

  // Postgres FK violation, e.g. an ID that doesn't exist where the
  // service didn't already check for it explicitly.
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'One of the submitted references is invalid.' },
    });
  }

  // Unknown/unexpected error: log the real thing server-side, tell the
  // customer as little as possible.
  // eslint-disable-next-line no-console
  console.error(`[error] ${req.method} ${req.originalUrl} ->`, err);
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our end. Please try again.',
      ...(env.isProduction ? {} : { debug: err.message }),
    },
  });
}

module.exports = errorMiddleware;
