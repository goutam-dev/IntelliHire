/**
 * Client-side validation utilities
 * Mirrors backend validation for consistency
 */

/**
 * Email validation
 */
export const isValidEmail = (email) => {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.length <= 254;
};

/**
 * Phone number validation (international format)
 */
export const isValidPhoneNumber = (phone) => {
  if (typeof phone !== 'string') return false;
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

/**
 * URL validation
 */
export const isValidUrl = (url) => {
  if (typeof url !== 'string') return false;
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

/**
 * String sanitization
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .substring(0, 10000);
};

/**
 * Validate string array (skills, tags, etc.)
 */
export const isValidStringArray = (arr, minItems = 0, maxItems = 100) => {
  if (!Array.isArray(arr)) return false;
  if (arr.length < minItems || arr.length > maxItems) return false;
  return arr.every(item => typeof item === 'string' && item.trim().length > 0 && item.length <= 100);
};

/**
 * Validate date
 */
export const isValidDate = (date) => {
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
};

/**
 * Validate enum value
 */
export const isValidEnum = (value, allowedValues) => {
  return allowedValues.includes(value);
};

/**
 * File validation
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['application/pdf'],
    allowedExtensions = ['.pdf']
  } = options;

  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  // Check file size
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File size must be less than ${(maxSize / 1024 / 1024).toFixed(0)}MB` 
    };
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
    };
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return { 
      valid: false, 
      error: `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}` 
    };
  }

  // Check for double extensions (e.g., .pdf.exe)
  const nameParts = file.name.split('.');
  if (nameParts.length > 2) {
    return { 
      valid: false, 
      error: 'File name contains multiple extensions' 
    };
  }

  // Check for suspicious characters in filename
  if (/[<>:"|?*\x00-\x1f]/g.test(file.name)) {
    return { 
      valid: false, 
      error: 'File name contains invalid characters' 
    };
  }

  return { valid: true, error: null };
};

/**
 * Read file magic numbers for validation
 */
export const validateFileMagicNumber = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onloadend = (e) => {
      if (!e.target?.result) {
        resolve({ valid: false, error: 'Could not read file' });
        return;
      }

      const arr = new Uint8Array(e.target.result);
      let header = '';
      for (let i = 0; i < Math.min(arr.length, 4); i++) {
        header += arr[i].toString(16).padStart(2, '0');
      }

      // PDF magic number: 25 50 44 46 (%PDF)
      if (file.type === 'application/pdf') {
        if (header.startsWith('25504446')) {
          resolve({ valid: true, error: null });
        } else {
          resolve({ valid: false, error: 'File is not a valid PDF' });
        }
        return;
      }

      // Image magic numbers
      if (file.type.startsWith('image/')) {
        const validImageHeaders = {
          'ffd8ff': 'image/jpeg',
          '89504e47': 'image/png',
          '47494638': 'image/gif',
          '52494646': 'image/webp'
        };

        for (const [magic, type] of Object.entries(validImageHeaders)) {
          if (header.startsWith(magic)) {
            resolve({ valid: true, error: null });
            return;
          }
        }
        resolve({ valid: false, error: 'Invalid image file' });
        return;
      }

      resolve({ valid: true, error: null });
    };

    reader.onerror = () => {
      resolve({ valid: false, error: 'Error reading file' });
    };

    reader.readAsArrayBuffer(file.slice(0, 4));
  });
};

/**
 * Validate personal info form
 */
export const validatePersonalInfo = (data) => {
  const errors = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (!data.phone || !isValidPhoneNumber(data.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate experience entry
 */
export const validateExperience = (exp) => {
  const errors = {};

  if (!exp.title || exp.title.trim().length < 2) {
    errors.title = 'Job title is required';
  }

  if (!exp.companyName || exp.companyName.trim().length < 2) {
    errors.companyName = 'Company name is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate education entry
 */
export const validateEducation = (edu) => {
  const errors = {};

  if (!edu.degree || edu.degree.trim().length < 2) {
    errors.degree = 'Degree is required';
  }

  if (!edu.institution || edu.institution.trim().length < 2) {
    errors.institution = 'Institution is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate job data
 */
export const validateJobData = (data) => {
  const errors = {};

  if (!data.title || data.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters';
  }

  if (!data.description || data.description.trim().length < 50) {
    errors.description = 'Description must be at least 50 characters';
  }

  if (!data.location || data.location.trim().length < 2) {
    errors.location = 'Location is required';
  }

  if (!data.employmentType) {
    errors.employmentType = 'Employment type is required';
  }

  if (!data.experienceLevel) {
    errors.experienceLevel = 'Experience level is required';
  }

  if (data.salaryRange) {
    if (data.salaryRange.min < 0) {
      errors.salaryMin = 'Minimum salary cannot be negative';
    }
    if (data.salaryRange.max < 0) {
      errors.salaryMax = 'Maximum salary cannot be negative';
    }
    if (data.salaryRange.min > data.salaryRange.max) {
      errors.salaryRange = 'Minimum salary cannot exceed maximum salary';
    }
  }

  if (!data.skills || !Array.isArray(data.skills) || data.skills.length === 0) {
    errors.skills = 'At least one skill is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Rate limiting utility
 */
export class RateLimiter {
  constructor(maxCalls, timeWindow) {
    this.maxCalls = maxCalls;
    this.timeWindow = timeWindow;
    this.calls = [];
  }

  canMakeCall() {
    const now = Date.now();
    this.calls = this.calls.filter(time => now - time < this.timeWindow);
    
    if (this.calls.length < this.maxCalls) {
      this.calls.push(now);
      return true;
    }
    
    return false;
  }

  reset() {
    this.calls = [];
  }
}

export default {
  isValidEmail,
  isValidPhoneNumber,
  isValidUrl,
  sanitizeString,
  isValidStringArray,
  isValidDate,
  isValidEnum,
  validateFile,
  validateFileMagicNumber,
  validatePersonalInfo,
  validateExperience,
  validateEducation,
  validateJobData,
  RateLimiter
};
