const employerService = require('../services/employerService');
const {
  asyncHandler,
  NotFoundError,
  ValidationError,
} = require('../utils/errorHandler');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

/**
 * Employer controller - thin controller that delegates to service layer
 */

// ========================================
// Multer Setup for Logo Uploads
// ========================================
const uploadDir = path.join(__dirname, '..', 'uploads', 'logos');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '');
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image uploads are allowed'));
};

exports.uploadLogoMiddleware = multer({ storage, fileFilter }).single('logo');

// ========================================
// Controller Methods
// ========================================

/**
 * Get employer profile
 */
exports.getEmployerProfile = asyncHandler(async (req, res) => {
  const profile = await employerService.getEmployerProfileByClerkId(
    req.auth.userId
  );
  res.json(profile);
});

/**
 * Update employer profile
 */
exports.updateEmployerProfile = asyncHandler(async (req, res) => {
  const profile = await employerService.updateEmployerProfile(
    req.auth.userId,
    req.body
  );
  res.json(profile);
});

/**
 * Get dashboard statistics
 */
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await employerService.getDashboardStats(req.auth.userId);
  res.json(stats);
});

/**
 * Update notification settings
 */
exports.updateNotificationSettings = asyncHandler(async (req, res) => {
  const EmployerProfile = require('../models/EmployerProfile');
  const User = require('../models/User');

  const user = await User.findOne({ clerkUserId: req.auth.userId });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const profile = await EmployerProfile.findOneAndUpdate(
    { user: user._id },
    { notificationSettings: req.body.notificationSettings },
    { new: true, runValidators: true }
  );

  if (!profile) {
    throw new NotFoundError('Employer profile not found');
  }

  res.json(profile.notificationSettings);
});

/**
 * Upload employer logo
 */
exports.uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ValidationError('No file uploaded');
  }

  const result = await employerService.uploadEmployerLogo(
    req.auth.userId,
    req.file.filename
  );

  res.status(201).json(result);
});

exports.changePassword = async (req, res, next) => {
  try {
    const employerId = resolveEmployerId(req.params.employerId || req.body.employerId);
    if (!employerId) {
      return res.status(400).json({ message: 'A valid employer identifier is required' });
    }

    // Find the profile and the user
    const profile = await EmployerProfile.findById(employerId).populate('user');
    if (!profile || !profile.user) {
      return res.status(404).json({ message: 'Employer or user not found' });
    }

    // If using external auth (e.g. Clerk), changing password here isn't applicable
    if (profile.user.authProvider !== 'local') {
      return res.status(400).json({ message: 'Password changes are managed by the authentication provider' });
    }

    // NOTE: User schema does not currently store a password hash. Implementing local password
    // management requires adding a password field and hashing (e.g., bcrypt). For now, return a clear error.
    return res.status(501).json({ message: 'Local password management not implemented' });
  } catch (error) {
    next(error);
  }
};
