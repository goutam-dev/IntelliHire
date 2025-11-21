const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const multer = require('multer');
const EmployerProfile = require('../models/EmployerProfile');
const User = require('../models/User');

const DEFAULT_EMPLOYER_ID = process.env.DEFAULT_EMPLOYER_ID || '000000000000000000000000';

const resolveEmployerId = (value) => {
  const candidate = value || DEFAULT_EMPLOYER_ID;
  if (!candidate || !mongoose.Types.ObjectId.isValid(candidate)) {
    return null;
  }
  return candidate;
};

exports.getEmployerProfile = async (req, res, next) => {
  try {
    const employerId = resolveEmployerId(req.params.employerId || req.query.employerId);
    if (!employerId) {
      return res.status(400).json({ message: 'A valid employer identifier is required' });
    }

    const profile = await EmployerProfile.findById(employerId).populate('user', 'fullName email role');
    if (!profile) {
      return res.status(404).json({ message: 'Employer profile not found' });
    }
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

exports.updateEmployerProfile = async (req, res, next) => {
  try {
    const employerId = resolveEmployerId(req.params.employerId || req.body.employerId);
    if (!employerId) {
      return res.status(400).json({ message: 'A valid employer identifier is required' });
    }

    const update = {
      companyName: req.body.companyName,
      industry: req.body.industry,
      companyDescription: req.body.companyDescription,
      companyWebsite: req.body.companyWebsite,
      companySize: req.body.companySize,
      contactEmail: req.body.contactEmail,
      phoneNumber: req.body.phoneNumber,
      location: req.body.location,
      socialLinks: req.body.socialLinks,
      logoUrl: req.body.logoUrl,
      notificationSettings: req.body.notificationSettings,
    };

    const profile = await EmployerProfile.findByIdAndUpdate(employerId, update, {
      new: true,
      runValidators: true,
    }).populate('user', 'fullName email role');

    if (!profile) {
      return res.status(404).json({ message: 'Employer profile not found' });
    }

    res.json(profile);
  } catch (error) {
    next(error);
  }
};

exports.updateNotificationSettings = async (req, res, next) => {
  try {
    const employerId = resolveEmployerId(req.params.employerId || req.body.employerId);
    if (!employerId) {
      return res.status(400).json({ message: 'A valid employer identifier is required' });
    }

    const profile = await EmployerProfile.findByIdAndUpdate(
      employerId,
      { notificationSettings: req.body.notificationSettings },
      { new: true, runValidators: true }
    );

    if (!profile) {
      return res.status(404).json({ message: 'Employer profile not found' });
    }

    res.json(profile.notificationSettings);
  } catch (error) {
    next(error);
  }
};

// Multer setup for logo uploads
const uploadDir = path.join(__dirname, '..', 'uploads', 'logos');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '');
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('Only image uploads are allowed'));
};

exports.uploadLogoMiddleware = multer({ storage, fileFilter }).single('logo');

exports.uploadLogo = async (req, res, next) => {
  try {
    // Find user from Clerk authentication
    const user = await User.findOne({ clerkUserId: req.auth.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const relativeUrl = `/uploads/logos/${req.file.filename}`;

    // Find and update the employer profile
    const profile = await EmployerProfile.findOneAndUpdate(
      { user: user._id },
      { logoUrl: relativeUrl },
      { new: true, runValidators: true, upsert: true }
    );

    if (!profile) {
      return res.status(404).json({ message: 'Employer profile not found' });
    }

    res.status(201).json({ logoUrl: relativeUrl });
  } catch (error) {
    next(error);
  }
};

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
