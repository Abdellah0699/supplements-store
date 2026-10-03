/**
 * app-error.js
 * A single error shape used everywhere in the app so the error
 * middleware can format a consistent response (see section 39 of the
 * brief): { success: false, error: { code, message, fields? } }.
 */

class AppError extends Error {
  constructor(message, { statusCode = 500, code = 'INTERNAL_ERROR', fields } = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
  }

  static validation(message, fields) {
    return new AppError(message, { statusCode: 400, code: 'VALIDATION_ERROR', fields });
  }

  static notFound(message) {
    return new AppError(message, { statusCode: 404, code: 'NOT_FOUND' });
  }

  static conflict(message) {
    return new AppError(message, { statusCode: 409, code: 'CONFLICT' });
  }

  static unauthorized(message = 'Authentication required.') {
    return new AppError(message, { statusCode: 401, code: 'UNAUTHORIZED' });
  }

  static forbidden(message = 'You do not have permission to perform this action.') {
    return new AppError(message, { statusCode: 403, code: 'FORBIDDEN' });
  }
}

module.exports = AppError;
