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
    const value = body[field];
    // Check for null, undefined, empty string, or whitespace-only string
    if (value === null || value === undefined || 
        (typeof value === 'string' && value.trim() === '') ||
        (Array.isArray(value) && value.length === 0)) {
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

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validate phone number format (basic validation)
 */
const isValidPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, '');
  // Check if it's a valid number between 10-15 digits, optionally starting with +
  const phoneRegex = /^\+?\d{10,15}$/;
  return phoneRegex.test(cleaned);
};

/**
 * Validate URL format
 */
const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

/**
 * Sanitize string input - remove HTML tags and trim
 */
const sanitizeString = (str, maxLength = null) => {
  if (!str || typeof str !== 'string') return '';
  // Remove HTML tags
  let sanitized = str.replace(/<[^>]*>/g, '');
  // Trim whitespace
  sanitized = sanitized.trim();
  // Truncate if maxLength specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  return sanitized;
};

/**
 * Validate array of strings
 */
const isValidStringArray = (arr, minLength = 0, maxLength = Infinity) => {
  if (!Array.isArray(arr)) return false;
  if (arr.length < minLength || arr.length > maxLength) return false;
  return arr.every(item => typeof item === 'string' && item.trim().length > 0);
};

/**
 * Validate date string or Date object
 */
const isValidDate = (date) => {
  if (!date) return false;
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj instanceof Date && !isNaN(dateObj.getTime());
};

/**
 * Validate enum value
 */
const isValidEnum = (value, allowedValues) => {
  return allowedValues.includes(value);
};

module.exports = {
  isValidObjectId,
  resolveEmployerId,
  validateRequiredFields,
  sanitizeUpdate,
  isValidEmail,
  isValidPhoneNumber,
  isValidUrl,
  sanitizeString,
  isValidStringArray,
  isValidDate,
  isValidEnum,
};
