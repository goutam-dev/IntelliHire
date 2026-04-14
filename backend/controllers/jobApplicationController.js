const applicationService = require('../services/applicationService');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * Job Application Controller
 */

// --- Candidate Actions ---

/**
 * Check if candidate has already applied to a job
 */
exports.checkApplicationStatus = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const result = await applicationService.checkApplicationStatus(req.user.id, jobId);
  res.json({
    success: true,
    data: result
  });
});

/**
 * Get candidate's profile data for application
 */
exports.getProfileDataForApplication = asyncHandler(async (req, res) => {
  const { jobId } = req.query;
  const data = await applicationService.getProfileDataForApplication(req.user.id, jobId);
  res.json({
    success: true,
    data
  });
});

/**
 * Submit job application
 */
exports.submitApplication = asyncHandler(async (req, res) => {
  const result = await applicationService.submitApplication(req.user.id, req.body, req.files || req.file);
  res.status(201).json({
    success: true,
    message: 'Application submitted successfully!',
    data: {
      applicationId: result.applicationId,
      status: result.status,
      appliedAt: result.appliedAt,
      appliedAgo: 'Just now', // Simple fallback
      jobId: result.jobId._id,
      job: {
        _id: result.jobId._id,
        title: result.jobId.title,
        company: result.jobId.company,
        location: result.jobId.location
      }
    }
  });
});

/**
 * Get candidate's applications
 */
exports.getMyApplications = asyncHandler(async (req, res) => {
  const result = await applicationService.getCandidateApplications(req.user.id, req.query);
  res.json({
    success: true,
    data: result
  });
});

/**
 * Get single application details
 */
exports.getApplicationById = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const result = await applicationService.getApplicationById(req.user.id, applicationId);
  res.json({
    success: true,
    data: result
  });
});

/**
 * Withdraw application
 */
exports.withdrawApplication = asyncHandler(async (req, res) => {
  const { applicationId } = req.params;
  const result = await applicationService.withdrawApplication(req.user.id, applicationId);
  res.json({
    success: true,
    message: 'Application withdrawn successfully',
    data: result
  });
});

/**
 * Download resume
 */
exports.downloadResume = asyncHandler(async (req, res) => {
  // This is a bit more complex as it involves file streaming.
  // For now, we'll rely on the service to return the path and handle streaming here
  // OR we can implement a simple download handler here if service returns path.
  
  // Note: applicationService doesn't have downloadResume yet.
  // We can implement it here or in service.
  // Given the complexity of file serving, let's do it here for now using logic from backend-1
  
  const candidateId = req.user.id;
  const { applicationId } = req.query;
  const JobApplication = require('../models/JobApplication');
  const CandidateProfile = require('../models/CandidateProfile');
  const path = require('path');
  const fs = require('fs');

  let resume;
    
  if (applicationId) {
    const application = await JobApplication.findOne({
      applicationId,
      candidateId
    });
    
    if (!application || !application.resume) {
      res.status(404).json({ success: false, message: 'Application or resume not found' });
      return;
    }
    
    resume = application.resume;
  } else {
    const profile = await CandidateProfile.findOne({ user: candidateId });
    
    if (!profile || !profile.resume || !profile.resume.fileUrl) {
      res.status(404).json({ success: false, message: 'Resume not found' });
      return;
    }
    
    resume = profile.resume;
  }

  let filePath;
  const resumeUrl = resume.fileUrl || resume.filePath;
  
  if (resumeUrl && resumeUrl.startsWith('http')) {
    return res.redirect(resumeUrl);
  } else if (resumeUrl) {
    // Construct path to backend/uploads from backend/controllers
    filePath = path.join(__dirname, '..', resumeUrl);
  } else {
    res.status(404).json({ success: false, message: 'Resume file path not found' });
    return;
  }

  // Validate path to prevent directory traversal
  const uploadsDir = path.join(__dirname, '..', 'uploads');
  const resolvedPath = path.resolve(filePath);
  const resolvedUploadsDir = path.resolve(uploadsDir);
  
  if (!resolvedPath.startsWith(resolvedUploadsDir)) {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ success: false, message: 'Resume file not found on server' });
    return;
  }

  const fileName = resume.fileName || resume.originalName || resume.filename || 'resume.pdf';
  // Sanitize filename for Content-Disposition header
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFileName}"`);
  res.setHeader('Content-Type', 'application/pdf');

  const fileStream = fs.createReadStream(filePath);
  
  // Handle stream errors
  fileStream.on('error', (error) => {
    console.error('File stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error reading file' });
    }
  });
  
  // Ensure stream is properly closed
  res.on('close', () => {
    fileStream.destroy();
  });

  fileStream.pipe(res);
});

// --- Employer Actions (Existing in applicationController.js? No, that was for listing) ---
// We can keep employer actions in applicationController.js or move them here.
// For now, let's keep them separate to minimize diffs, or if we want to consolidate...
// The user asked to "refactor cleanly".
// applicationController.js currently handles employer actions.
// jobApplicationController.js (this file) handles candidate actions.
// This separation is fine.
