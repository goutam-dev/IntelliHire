const candidateService = require('../services/candidateService');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * Candidate controller - thin controller that delegates to service layer
 */

/**
 * Get candidate profile
 */
exports.getCandidateProfile = asyncHandler(async (req, res) => {
  const profile = await candidateService.getCandidateProfile(req.user.id);
  res.json(profile);
});

/**
 * Update basic info
 */
exports.updateBasicInfo = asyncHandler(async (req, res) => {
  const profile = await candidateService.updateBasicInfo(req.user.id, req.body);
  res.json(profile);
});

/**
 * Upload resume
 */
exports.uploadResume = asyncHandler(async (req, res) => {
  const result = await candidateService.uploadResume(req.user.id, req.file);
  res.json({
    success: true,
    message: 'Resume uploaded successfully',
    ...result
  });
});

/**
 * Add education
 */
exports.addEducation = asyncHandler(async (req, res) => {
  const result = await candidateService.addEducation(req.user.id, req.body);
  res.json({
    success: true,
    message: 'Education added successfully',
    ...result
  });
});

/**
 * Update education
 */
exports.updateEducation = asyncHandler(async (req, res) => {
  const profile = await candidateService.updateEducation(req.user.id, req.params.educationId, req.body);
  res.json(profile);
});

/**
 * Delete education
 */
exports.deleteEducation = asyncHandler(async (req, res) => {
  const profile = await candidateService.deleteEducation(req.user.id, req.params.educationId);
  res.json(profile);
});

/**
 * Add experience
 */
exports.addExperience = asyncHandler(async (req, res) => {
  const result = await candidateService.addExperience(req.user.id, req.body);
  res.json({
    success: true,
    message: 'Work experience added successfully',
    ...result
  });
});

/**
 * Update experience
 */
exports.updateExperience = asyncHandler(async (req, res) => {
  const profile = await candidateService.updateExperience(req.user.id, req.params.experienceId, req.body);
  res.json(profile);
});

/**
 * Delete experience
 */
exports.deleteExperience = asyncHandler(async (req, res) => {
  const profile = await candidateService.deleteExperience(req.user.id, req.params.experienceId);
  res.json(profile);
});

/**
 * Update skills
 */
exports.updateSkills = asyncHandler(async (req, res) => {
  // Extract skills from body - handle both { skills: [...] } and direct array
  const skills = Array.isArray(req.body) ? req.body : req.body.skills;
  
  if (!skills) {
    return res.status(400).json({ error: 'Skills array is required' });
  }
  
  const result = await candidateService.updateSkills(req.user.id, skills);
  res.json({
    success: true,
    message: 'Skills updated successfully',
    ...result
  });
});

/**
 * Delete resume
 */
exports.deleteResume = asyncHandler(async (req, res) => {
  const profile = await candidateService.deleteResume(req.user.id);
  res.json(profile);
});

/**
 * Upload photo
 */
exports.uploadPhoto = asyncHandler(async (req, res) => {
  const profile = await candidateService.uploadPhoto(req.user.id, req.file);
  res.json({
    success: true,
    message: 'Profile photo uploaded successfully',
    profile
  });
});

/**
 * Delete photo
 */
exports.deletePhoto = asyncHandler(async (req, res) => {
  const result = await candidateService.deletePhoto(req.user.id);
  res.json({
    success: true,
    message: 'Profile photo removed successfully',
    profile: result
  });
});

/**
 * Update notification preferences
 */
exports.updateNotificationPreferences = asyncHandler(async (req, res) => {
  const preferences = await candidateService.updateNotificationPreferences(req.user.id, req.body);
  res.json({
    success: true,
    message: 'Notification preferences updated successfully',
    preferences
  });
});

/**
 * Get profile completion
 */
exports.getProfileCompletion = asyncHandler(async (req, res) => {
  const result = await candidateService.getProfileCompletion(req.user.id);
  res.json(result);
});

/**
 * Get candidate dashboard statistics
 */
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await candidateService.getCandidateDashboardStats(req.user.id);
  res.json(stats);
});
