/**
 * Error Handling Middleware
 * Centralized error processing with consistent response format
 */

const logger = require('../utils/logger');
const { errorResponse } = require('../utils/response');
const env = require('../config/env');

/**
 * Custom application error class
 */
class AppError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    404,
    'NOT_FOUND',
    `Resource not found: ${req.method} ${req.originalUrl}`
  );
  next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
  } else if (err.name === 'CastError') {
    // Mongoose cast error (invalid ObjectId)
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    code = 'DUPLICATE_ERROR';
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    code = 'FILE_UPLOAD_ERROR';
    message = err.message;
  }

  // Log error
  const logData = {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    code,
    userId: req.user?.id
  };

  if (statusCode >= 500) {
    logger.error(message, { ...logData, stack: err.stack });
  } else {
    logger.warn(message, logData);
  }

  // Don't leak stack traces in production
  if (env.nodeEnv === 'production' && !err.isOperational) {
    message = 'An unexpected error occurred';
    details = null;
  }

  return errorResponse(res, statusCode, code, message, details);
};

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler
};
