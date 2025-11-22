const User = require('../models/User');
const CandidateProfile = require('../models/CandidateProfile');
const JobApplication = require('../models/JobApplication');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
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

  let profile = await CandidateProfile.findOne({ user: userId })
    .populate('user', 'fullName email phoneNumber');
  
  if (!profile) {
    // Create a new profile with safe default values
    profile = new CandidateProfile({ 
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
    });
    
    await profile.save();
    
    // Fetch the populated profile
    profile = await CandidateProfile.findOne({ user: userId })
      .populate('user', 'fullName email phoneNumber');
  }

  // Ensure user data exists
  if (!profile.user) {
    const user = await User.findById(userId);
    profile.user = {
      fullName: user.fullName || 'New Candidate',
      email: user.email || 'user@example.com'
    };
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
  
  let profile = await CandidateProfile.findOne({ user: userId });
  
  if (!profile) {
    profile = new CandidateProfile({ user: userId });
  }

  // Update profile fields
  if (phoneNumber !== undefined) profile.phoneNumber = phoneNumber;
  if (location !== undefined) profile.location = location;
  if (professionalTitle !== undefined) profile.professionalTitle = professionalTitle;
  if (headline !== undefined) profile.headline = headline;
  if (summary !== undefined) profile.summary = summary;
  if (linkedinUrl !== undefined) profile.linkedinUrl = linkedinUrl;
  if (portfolioUrl !== undefined) profile.portfolioUrl = portfolioUrl;

  await profile.save();

  // Update user's fullName if provided
  if (fullName) {
    await User.findByIdAndUpdate(userId, { fullName });
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
    const oldFilePath = path.join(__dirname, '../../', profile.resume.fileUrl);
    if (fs.existsSync(oldFilePath)) {
      try {
        fs.unlinkSync(oldFilePath);
      } catch (err) {
        console.error('Error deleting old resume:', err);
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
  if (!Array.isArray(skills)) {
    throw new ValidationError('Skills must be an array');
  }
  
  if (skills.length < 3) {
    throw new ValidationError('At least 3 skills are required');
  }
  
  let profile = await CandidateProfile.findOne({ user: userId });
  
  if (!profile) {
    profile = new CandidateProfile({ user: userId });
  }

  profile.skills = skills;
  await profile.save();
  
  const updatedProfile = await CandidateProfile.findOne({ user: userId }).populate('user', 'fullName email phoneNumber');
  
  return {
    profile: updatedProfile,
    completion: updatedProfile.profileCompletion
  };
};

/**
 * Delete resume
 */
const deleteResume = async (userId) => {
  const profile = await CandidateProfile.findOne({ user: userId });
  
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }

  // Delete physical file if exists
  if (profile.resume && profile.resume.fileUrl) {
    const filePath = path.join(__dirname, '../../', profile.resume.fileUrl);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting resume file:', err);
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
    const oldFilePath = path.join(__dirname, '../../', profile.profilePhotoUrl);
    if (fs.existsSync(oldFilePath)) {
      try {
        fs.unlinkSync(oldFilePath);
      } catch (err) {
        console.error('Error deleting old photo:', err);
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
    const filePath = path.join(__dirname, '../../', profile.profilePhotoUrl);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting photo file:', err);
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

