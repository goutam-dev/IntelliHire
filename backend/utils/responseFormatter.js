/**
 * Standardized API response formatting utilities
 */

/**
 * Send successful response
 */
const sendSuccess = (res, data, statusCode = 200) => {
  return res.status(statusCode).json(data);
};

/**
 * Send error response
 */
const sendError = (res, message, statusCode = 500) => {
  return res.status(statusCode).json({
    error: message,
  });
};

/**
 * Send created response (201)
 */
const sendCreated = (res, data) => {
  return res.status(201).json(data);
};

/**
 * Send no content response (204)
 */
const sendNoContent = (res) => {
  return res.status(204).send();
};

module.exports = {
  sendSuccess,
  sendError,
  sendCreated,
  sendNoContent,
};
