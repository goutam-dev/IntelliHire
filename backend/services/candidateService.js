const User = require('../models/User');
const CandidateProfile = require('../models/CandidateProfile');
const JobApplication = require('../models/JobApplication');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

/**
 * Candidate service - handles all candidate-related business logic
 */

// Helper to ensure we always have a candidate user document
const ensureCandidateUser = async (userId) => {
  let user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
};

/**
 * Get candidate profile
 */
const getCandidateProfile = async (userId) => {
  await ensureCandidateUser(userId);

  // Use findOneAndUpdate with upsert to avoid race condition
  let profile = await CandidateProfile.findOneAndUpdate(
    { user: userId },
    {
      $setOnInsert: {
        user: userId,
        skills: [],
        phoneNumber: '',
        location: '', 
        professionalTitle: '',
        education: [],
        experience: [],
        stats: {
          totalApplications: 0,
          pending: 0,
          shortlisted: 0,
          rejected: 0
        }
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate('user', 'fullName email phoneNumber');
  
  if (!profile) {
    throw new NotFoundError('Failed to retrieve or create profile');
  }

  // Ensure user data exists
  if (!profile.user) {
    const user = await User.findById(userId);
    if (user) {
      profile.user = {
        fullName: user.fullName || 'New Candidate',
        email: user.email || 'user@example.com',
        phoneNumber: user.phoneNumber || ''
      };
    } else {
      throw new NotFoundError('User data not found');
    }
  }

  const profileResponse = profile.toObject();
  const populatedUser = profileResponse.user || {};

  // Flatten user data for response if needed, or keep as is
  // The frontend expects user object inside profile
  
  return profileResponse;
};

/**
 * Update basic info
 */
const updateBasicInfo = async (userId, data) => {
  const { fullName, phoneNumber, location, professionalTitle, headline, summary, linkedinUrl, portfolioUrl } = data;
  const { isValidPhoneNumber, isValidUrl, sanitizeString } = require('../utils/validators');
  
  // Validate inputs
  if (phoneNumber && !isValidPhoneNumber(phoneNumber)) {
    throw new ValidationError('Invalid phone number format');
  }
  
  if (linkedinUrl && !isValidUrl(linkedinUrl)) {
    throw new ValidationError('Invalid LinkedIn URL format');
  }
  
  if (portfolioUrl && !isValidUrl(portfolioUrl)) {
    throw new ValidationError('Invalid portfolio URL format');
  }
  
  if (summary && summary.length > 500) {
    throw new ValidationError('Summary must be 500 characters or less');
  }
  
  let profile = await CandidateProfile.findOne({ user: userId });
  
  if (!profile) {
    profile = new CandidateProfile({ user: userId });
  }

  // Update profile fields with sanitization
  if (phoneNumber !== undefined) profile.phoneNumber = phoneNumber.trim();
  if (location !== undefined) profile.location = sanitizeString(location, 100);
  if (professionalTitle !== undefined) profile.professionalTitle = sanitizeString(professionalTitle, 100);
  if (headline !== undefined) profile.headline = sanitizeString(headline, 200);
  if (summary !== undefined) profile.summary = sanitizeString(summary, 500);
  if (linkedinUrl !== undefined) profile.linkedinUrl = linkedinUrl.trim();
  if (portfolioUrl !== undefined) profile.portfolioUrl = portfolioUrl.trim();

  await profile.save();

  // Update user's fullName if provided
  if (fullName) {
    const sanitizedFullName = sanitizeString(fullName, 100);
    await User.findByIdAndUpdate(userId, { fullName: sanitizedFullName });
  }
  
  return await CandidateProfile.findOne({ user: userId }).populate('user', 'fullName email phoneNumber');
};

/**
 * Upload resume
 */
const uploadResume = async (userId, file) => {
  if (!file) {
    throw new ValidationError('No file uploaded');
  }

  let profile = await CandidateProfile.findOne({ user: userId });
  
  if (!profile) {
    profile = new CandidateProfile({ user: userId });
  }

  // Delete old resume file if exists
  if (profile.resume && profile.resume.fileUrl) {
    // Assuming uploads directory is at root/uploads
    const oldFilePath = path.join(__dirname, '..', profile.resume.fileUrl);
    // Validate path to prevent directory traversal
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const resolvedPath = path.resolve(oldFilePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    
    if (resolvedPath.startsWith(resolvedUploadsDir) && fs.existsSync(oldFilePath)) {
      try {
        fs.unlinkSync(oldFilePath);
        logger.info(`Deleted old resume file: ${oldFilePath}`);
      } catch (err) {
        logger.error('Error deleting old resume:', err);
      }
    }
  }

  profile.resume = {
    fileName: file.originalname,
    fileUrl: `/uploads/resumes/${file.filename}`,
    uploadedAt: new Date()
  };

  await profile.save();
  
  const updatedProfile = await CandidateProfile.findOne({ user: userId }).populate('user', 'fullName email phoneNumber');
  
  return {
    profile: updatedProfile,
    completion: updatedProfile.profileCompletion
  };
};

/**
 * Add education
 */
const addEducation = async (userId, educationData) => {
  // Validate required fields
  const requiredFields = ['degree', 'fieldOfStudy', 'institution', 'startDate'];
  for (const field of requiredFields) {
    if (!educationData[field]) {
      throw new ValidationError(`${field} is required`);
    }
  }
  
  let profile = await CandidateProfile.findOne({ user: userId });
  
  if (!profile) {
    profile = new CandidateProfile({ user: userId });
  }

  profile.education.push(educationData);
  await profile.save();
  
  const updatedProfile = await CandidateProfile.findOne({ user: userId }).populate('user', 'fullName email phoneNumber');
  
  return {
    profile: updatedProfile,
    completion: updatedProfile.profileCompletion
  };
};

/**
 * Update education entry
 */
const updateEducation = async (userId, educationId, educationData) => {
  const profile = await CandidateProfile.findOne({ user: userId });
  
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }

  const educationIndex = profile.education.findIndex(edu => edu._id.toString() === educationId);
  
  if (educationIndex === -1) {
    throw new NotFoundError('Education entry not found');
  }

  // Merge existing data with updates
  const currentEducation = profile.education[educationIndex].toObject();
  profile.education[educationIndex] = { ...currentEducation, ...educationData };
  
  await profile.save();
  
  return await CandidateProfile.findOne({ user: userId }).populate('user', 'fullName email phoneNumber');
};

/**
 * Delete education entry
 */
const deleteEducation = async (userId, educationId) => {
  const profile = await CandidateProfile.findOne({ user: userId });
  
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }

  profile.education = profile.education.filter(edu => edu._id.toString() !== educationId);
  await profile.save();
  
  return await CandidateProfile.findOne({ user: userId }).populate('user', 'fullName email phoneNumber');
};

/**
 * Add experience
 */
const addExperience = async (userId, experienceData) => {
  // Validate required fields
  const requiredFields = ['title', 'companyName'];
  for (const field of requiredFields) {
    if (!experienceData[field]) {
      throw new ValidationError(`${field} is required`);
    }
  }
  
  // Validate experience type specific requirements
  if (experienceData.experienceType === 'specific') {
    if (!experienceData.startDate) {
      throw new ValidationError('Start date is required for specific date experience');
    }
  } else if (experienceData.experienceType === 'years') {
    if (!experienceData.yearsOfExperience || experienceData.yearsOfExperience < 0) {
      throw new ValidationError('Years of experience is required');
    }
  }
  
  let profile = await CandidateProfile.findOne({ user: userId });
  
  if (!profile) {
    profile = new CandidateProfile({ user: userId });
  }

  profile.experience.push(experienceData);
  await profile.save();
  
  const updatedProfile = await CandidateProfile.findOne({ user: userId }).populate('user', 'fullName email phoneNumber');
  
  return {
    profile: updatedProfile,
    completion: updatedProfile.profileCompletion
  };
};

/**
 * Update experience entry
 */
const updateExperience = async (userId, experienceId, experienceData) => {
  const profile = await CandidateProfile.findOne({ user: userId });
  
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }

  const experienceIndex = profile.experience.findIndex(exp => exp._id.toString() === experienceId);
  
  if (experienceIndex === -1) {
    throw new NotFoundError('Experience entry not found');
  }

  const currentExperience = profile.experience[experienceIndex].toObject();
  profile.experience[experienceIndex] = { ...currentExperience, ...experienceData };
  
  await profile.save();
  
  return await CandidateProfile.findOne({ user: userId }).populate('user', 'fullName email phoneNumber');
};

/**
 * Delete experience entry
 */
const deleteExperience = async (userId, experienceId) => {
  const profile = await CandidateProfile.findOne({ user: userId });
  
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }

  profile.experience = profile.experience.filter(exp => exp._id.toString() !== experienceId);
  await profile.save();
  
  return await CandidateProfile.findOne({ user: userId }).populate('user', 'fullName email phoneNumber');
};

/**
 * Update skills
 */
const updateSkills = async (userId, skills) => {
  const { isValidStringArray, sanitizeString } = require('../utils/validators');
  
  if (!Array.isArray(skills)) {
    throw new ValidationError('Skills must be an array');
  }
  
  if (skills.length < 3) {
    throw new ValidationError('At least 3 skills are required');
  }
  
  if (skills.length > 50) {
    throw new ValidationError('Maximum 50 skills allowed');
  }
  
  // Validate and sanitize each skill
  const sanitizedSkills = skills
    .map(skill => sanitizeString(skill, 50))
    .filter(skill => skill.length > 0);
  
  if (sanitizedSkills.length < 3) {
    throw new ValidationError('At least 3 valid skills are required after sanitization');
  }
  
  let profile = await CandidateProfile.findOne({ user: userId });
  
  if (!profile) {
    profile = new CandidateProfile({ user: userId });
  }

  profile.skills = sanitizedSkills;
  await profile.save();
  
  const updatedProfile = await CandidateProfile.findOne({ user: userId }).populate('user', 'fullName email phoneNumber');
  
  return {
    profile: updatedProfile,
    completion: updatedProfile.profileCompletion
  };
};

/**
 * Delete resume from candidate profile
 * NOTE: This only deletes the resume from the candidate's profile.
 * Resumes submitted with job applications are stored separately in /uploads/applications/
 * and are NOT affected by this deletion, so employers can still access them.
 */
const deleteResume = async (userId) => {
  const profile = await CandidateProfile.findOne({ user: userId });
  
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }

  // Delete physical file from profile resumes folder only
  // Application resumes are stored separately and are not deleted
  if (profile.resume && profile.resume.fileUrl) {
    const filePath = path.join(__dirname, '..', profile.resume.fileUrl);
    // Validate path to prevent directory traversal
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    
    // Only delete if it's in the uploads directory and NOT in the applications subfolder
    if (resolvedPath.startsWith(resolvedUploadsDir) && 
        !resolvedPath.includes('applications') && 
        fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        logger.info(`Deleted profile resume file: ${filePath}`);
      } catch (err) {
        logger.error('Error deleting profile resume file:', err);
      }
    }
  }

  profile.resume = {};
  await profile.save();
  
  return await CandidateProfile.findOne({ user: userId }).populate('user', 'fullName email phoneNumber');
};

/**
 * Upload profile photo
 */
const uploadPhoto = async (userId, file) => {
  if (!file) {
    throw new ValidationError('No file uploaded');
  }

  if (!file.mimetype.startsWith('image/')) {
    throw new ValidationError('Only image files are allowed');
  }

  let profile = await CandidateProfile.findOne({ user: userId });
  
  if (!profile) {
    profile = new CandidateProfile({ user: userId });
  }

  // Delete old photo file if exists
  if (profile.profilePhotoUrl) {
    const oldFilePath = path.join(__dirname, '..', profile.profilePhotoUrl);
    // Validate path to prevent directory traversal
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const resolvedPath = path.resolve(oldFilePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    
    if (resolvedPath.startsWith(resolvedUploadsDir) && fs.existsSync(oldFilePath)) {
      try {
        fs.unlinkSync(oldFilePath);
        logger.info(`Deleted old photo file: ${oldFilePath}`);
      } catch (err) {
        logger.error('Error deleting old photo:', err);
      }
    }
  }

  profile.profilePhotoUrl = `/uploads/photos/${file.filename}`;
  await profile.save();
  
  return await CandidateProfile.findOne({ user: userId }).populate('user', 'fullName email phoneNumber');
};

/**
 * Delete profile photo
 */
const deletePhoto = async (userId) => {
  const profile = await CandidateProfile.findOne({ user: userId });
  
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }

  // Delete physical file if exists
  if (profile.profilePhotoUrl) {
    const filePath = path.join(__dirname, '..', profile.profilePhotoUrl);
    // Validate path to prevent directory traversal
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    
    if (resolvedPath.startsWith(resolvedUploadsDir) && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        logger.info(`Deleted photo file: ${filePath}`);
      } catch (err) {
        logger.error('Error deleting photo file:', err);
      }
    }
  }

  profile.profilePhotoUrl = null;
  await profile.save();
  
  return await CandidateProfile.findOne({ user: userId }).populate('user', 'fullName email phoneNumber');
};

/**
 * Update notification preferences
 */
const updateNotificationPreferences = async (userId, preferences) => {
  let profile = await CandidateProfile.findOne({ user: userId });
  
  if (!profile) {
    profile = new CandidateProfile({ user: userId });
  }

  profile.notificationPreferences = {
    applicationUpdates: Boolean(preferences.applicationUpdates),
    jobRecommendations: Boolean(preferences.jobRecommendations),
    marketingEmails: Boolean(preferences.marketingEmails)
  };

  await profile.save();
  
  return profile.notificationPreferences;
};

/**
 * Get profile completion status
 */
const getProfileCompletion = async (userId) => {
  let profile = await CandidateProfile.findOne({ user: userId });
  
  if (!profile) {
    profile = new CandidateProfile({ user: userId });
    await profile.save();
  }

  const completion = profile.calculateCompletion();
  
  // Get incomplete sections for UI
  const incompleteSections = [];
  
  if (!completion.resume) {
    incompleteSections.push({
      key: 'resume',
      title: 'Upload Resume',
      description: 'Employers want to see your experience',
      percentage: 20
    });
  }
  
  if (!completion.education) {
    incompleteSections.push({
      key: 'education',
      title: 'Add Education',
      description: 'Show your academic background',
      percentage: 20
    });
  }
  
  if (!completion.experience) {
    incompleteSections.push({
      key: 'experience',
      title: 'Add Work Experience',
      description: 'Highlight your professional journey',
      percentage: 20
    });
  }
  
  if (!completion.skills) {
    incompleteSections.push({
      key: 'skills',
      title: 'Add Skills',
      description: 'Help employers find you',
      percentage: 20
    });
  }

  return {
    completion,
    incompleteSections,
    isComplete: completion.percentage === 100
  };
};

/**
 * Get candidate dashboard statistics
 */
const getCandidateDashboardStats = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const totalApplications = await JobApplication.countDocuments({
    candidateId: user._id,
  });
  const pendingApplications = await JobApplication.countDocuments({
    candidateId: user._id,
    status: 'Applied',
  });
  const shortlistedApplications = await JobApplication.countDocuments({
    candidateId: user._id,
    status: { $in: ['Shortlisted', 'Interview Scheduled'] },
  });
  const rejectedApplications = await JobApplication.countDocuments({
    candidateId: user._id,
    status: 'Rejected',
  });

  return {
    totalApplications,
    pending: pendingApplications,
    shortlisted: shortlistedApplications,
    rejected: rejectedApplications,
  };
};

module.exports = {
  getCandidateProfile,
  updateBasicInfo,
  uploadResume,
  addEducation,
  updateEducation,
  deleteEducation,
  addExperience,
  updateExperience,
  deleteExperience,
  updateSkills,
  deleteResume,
  uploadPhoto,
  deletePhoto,
  updateNotificationPreferences,
  getProfileCompletion,
  getCandidateDashboardStats,
};

