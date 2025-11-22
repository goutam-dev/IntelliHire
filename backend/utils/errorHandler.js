/**
 * Custom error classes and error handling utilities
 */

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class AuthError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
    this.name = 'AuthError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  const logger = require('./logger');
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  // Log error with appropriate level
  if (statusCode === 500) {
    logger.error('Server Error:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
    });
  } else if (statusCode >= 400) {
    logger.warn('Client Error:', {
      message: err.message,
      statusCode,
      url: req.originalUrl,
      method: req.method,
    });
  }
  
  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  AuthError,
  ForbiddenError,
  errorHandler,
  asyncHandler,
};
