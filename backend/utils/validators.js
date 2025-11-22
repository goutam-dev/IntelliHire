const mongoose = require('mongoose');

/**
 * Validation utilities
 */

/**
 * Validate if a string is a valid MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  return id && mongoose.Types.ObjectId.isValid(id);
};

/**
 * Resolve employer ID with fallback to default
 * Returns null if invalid, otherwise returns the ID
 */
const resolveEmployerId = (value, defaultId = null) => {
  const candidate = value || defaultId;
  if (!candidate || !isValidObjectId(candidate)) {
    return null;
  }
  return candidate;
};

/**
 * Validate required fields in request body
 */
const validateRequiredFields = (body, requiredFields) => {
  const missing = [];
  
  for (const field of requiredFields) {
    if (!body[field]) {
      missing.push(field);
    }
  }
  
  if (missing.length > 0) {
    return {
      valid: false,
      message: `Missing required fields: ${missing.join(', ')}`,
      missing,
    };
  }
  
  return { valid: true };
};

/**
 * Sanitize update object - only allow specified fields
 */
const sanitizeUpdate = (body, allowedFields) => {
  const sanitized = {};
  
  allowedFields.forEach((field) => {
    if (body[field] !== undefined) {
      sanitized[field] = body[field];
    }
  });
  
  return sanitized;
};

module.exports = {
  isValidObjectId,
  resolveEmployerId,
  validateRequiredFields,
  sanitizeUpdate,
};
