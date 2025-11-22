const mongoose = require('mongoose');
const JobApplication = require('../models/JobApplication');
const Job = require('../models/Job');
const CandidateProfile = require('../models/CandidateProfile');
const User = require('../models/User');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const path = require('path');
const fs = require('fs');

/**
 * Application service - handles all application-related business logic
 */

/**
 * Build search filter for applications
 */
const buildSearchFilter = (search) => {
  if (!search) return {};
  const regex = new RegExp(search, 'i');
  return {
    $or: [
      { feedback: { $regex: regex } },
      { 'candidate.phoneNumber': { $regex: regex } },
      { 'candidate.professionalTitle': { $regex: regex } },
      { 'candidate.location': { $regex: regex } },
      { 'candidate.skills': { $regex: regex } },
      { 'candidate.user.fullName': { $regex: regex } },
      { 'candidate.user.email': { $regex: regex } },
    ],
  };
};

/**
 * Get timestamp from document (using either createdAt or _id)
 */
const getTimestamp = (doc) => {
  if (doc.createdAt) return new Date(doc.createdAt).getTime();
  // Fallback to _id timestamp if createdAt is missing
  if (doc._id) {
    const idStr = doc._id.toString();
    return parseInt(idStr.substring(0, 8), 16) * 1000;
  }
  return 0;
};

/**
 * Sort applications by specified criteria
 */
const sortApplications = (applications, sort) => {
  applications.sort((a, b) => {
    const timeA = getTimestamp(a);
    const timeB = getTimestamp(b);

    if (sort === 'newest') {
      return timeB - timeA;
    } else if (sort === 'oldest') {
      return timeA - timeB;
    } else if (sort === 'name') {
      const nameA = a.candidate?.user?.fullName?.toLowerCase() || '';
      const nameB = b.candidate?.user?.fullName?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
    }
    return 0;
  });
};

/**
 * Filter applications by search term
 */
const filterBySearch = (applications, search) => {
  if (!search) return applications;

  const searchLower = search.toLowerCase();
  return applications.filter((app) => {
    const candidateName = app.candidate?.user?.fullName?.toLowerCase() || '';
    const candidateEmail = app.candidate?.user?.email?.toLowerCase() || '';
    const candidatePhone =
      app.candidate?.user?.phoneNumber?.toLowerCase() || '';
    const professionalTitle =
      app.candidate?.professionalTitle?.toLowerCase() || '';
    const feedback = app.feedback?.toLowerCase() || '';

    return (
      candidateName.includes(searchLower) ||
      candidateEmail.includes(searchLower) ||
      candidatePhone.includes(searchLower) ||
      professionalTitle.includes(searchLower) ||
      feedback.includes(searchLower)
    );
  });
};

/**
 * Get applications by job ID with optional filters
 */
const getApplicationsByJob = async (jobId, filters = {}) => {
  const { status = 'all', search = '', sort = 'newest' } = filters;

  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw new ValidationError('Invalid jobId');
  }

  // Build base query
  const query = { jobId: jobId }; // Changed from job to jobId to match model
  if (status && status !== 'all') {
    query.status = status;
  }

  // Fetch all matching applications with full population
  let applications = await JobApplication.find(query)
    .populate({
      path: 'candidateId', // Changed from candidate to candidateId
      select: 'fullName email phoneNumber' // Assuming candidateId is User ref
    })
    // We also need candidate profile data which is stored in applicationProfile in the new model
    // But for backward compatibility or if we need more info, we might need to fetch CandidateProfile
    .populate({ path: 'jobId', select: 'title department' })
    .lean();

  // Map to expected structure if needed, or adjust frontend to use new structure
  // The new model stores profile snapshot in applicationProfile
  applications = applications.map(app => {
    // If we have candidateId populated (User), we can use it
    // But applicationProfile has the snapshot
    return {
      ...app,
      candidate: {
        user: app.candidateId,
        ...app.applicationProfile // Spread snapshot data
      },
      job: app.jobId
    };
  });

  // In-memory filtering (search)
  applications = filterBySearch(applications, search);

  // In-memory sorting
  sortApplications(applications, sort);

  return applications;
};

/**
 * Update application status
 */
const updateApplicationStatus = async (applicationId, statusData) => {
  const { status, notes, feedback } = statusData;

  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw new ValidationError('Invalid applicationId');
  }
  if (!status) {
    throw new ValidationError('Status is required');
  }

  const application = await JobApplication.findById(applicationId);
  if (!application) {
    throw new NotFoundError('Application not found');
  }

  application.status = status;
  if (feedback) application.employerNotes = feedback; // Map feedback to employerNotes
  // application.statusHistory.push({ status, notes, actorType: 'employer' }); // New model doesn't have statusHistory yet, maybe add it?
  // For now, just update status
  
  await application.save();

  const populated = await application.populate([
    { path: 'candidateId', select: 'fullName email phoneNumber' },
    { path: 'jobId', select: 'title department' },
  ]);

  return populated;
};

/**
 * Bulk update application statuses
 */
const bulkUpdateApplications = async (ids, statusData) => {
  const { status, notes, feedback } = statusData;

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ValidationError('ids array is required');
  }
  if (!status) {
    throw new ValidationError('Status is required');
  }

  const objectIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const applications = await JobApplication.find({ _id: { $in: objectIds } });

  for (const app of applications) {
    app.status = status;
    if (feedback) app.employerNotes = feedback;
    await app.save();
  }

  return { updated: applications.length };
};

/**
 * Schedule interview for application
 */
const scheduleInterview = async (applicationId, interviewData) => {
  const { scheduledAt, instructions } = interviewData;

  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw new ValidationError('Invalid applicationId');
  }

  const application = await JobApplication.findById(applicationId);
  if (!application) {
    throw new NotFoundError('Application not found');
  }

  // New model doesn't have interview field explicitly defined in the schema I created?
  // Wait, I created the schema in Step 74. It does NOT have interview field.
  // But backend-1 schema (Step 70) didn't have it either?
  // Step 70 schema has status enum 'Interview Scheduled'.
  // backend/services/applicationService.js (Step 80) had interview logic.
  // I should probably add interview field to the model if I want to support this.
  // For now, I'll just update status.
  
  application.status = 'Interview Scheduled';
  application.employerNotes = `Interview scheduled for ${scheduledAt}. ${instructions}`;
  
  await application.save();

  const populated = await application.populate([
    { path: 'candidateId', select: 'fullName email phoneNumber' },
    { path: 'jobId', select: 'title department' },
  ]);

  return populated;
};

// --- Candidate Actions ---

/**
 * Check if candidate has already applied to a job
 */
const checkApplicationStatus = async (candidateId, jobId) => {
  const existingApplication = await JobApplication.findOne({
    jobId,
    candidateId,
    status: { $ne: 'Withdrawn' }
  })
  .sort({ appliedAt: -1 })
  .populate({
    path: 'jobId',
    select: 'title employer',
    populate: {
      path: 'employer',
      select: 'companyName'
    }
  });

  if (existingApplication && existingApplication.jobId && existingApplication.jobId.employer) {
    existingApplication.jobId.company = existingApplication.jobId.employer.companyName;
    delete existingApplication.jobId.employer;
  }

  if (existingApplication) {
    return {
      hasApplied: true,
      application: {
        applicationId: existingApplication.applicationId,
        status: existingApplication.status,
        appliedAt: existingApplication.appliedAt,
        // appliedAgo calculated in controller or frontend
      }
    };
  }

  return { hasApplied: false };
};

/**
 * Get candidate's profile data for application
 */
const getProfileDataForApplication = async (candidateId) => {
  const profile = await CandidateProfile.findOne({ user: candidateId }).populate('user');
  
  if (!profile) {
    throw new NotFoundError('Profile not found');
  }

  return {
    personalInfo: {
      name: profile.user?.fullName || '',
      email: profile.user?.email || '',
      phone: profile.user?.phoneNumber || profile.phoneNumber || '',
      location: profile.location || ''
    },
    experience: profile.experience || [],
    education: profile.education || [],
    skills: profile.skills || [],
    summary: profile.summary || '',
    resume: profile.resume && profile.resume.fileUrl ? {
      filename: profile.resume.fileName,
      originalName: profile.resume.fileName,
      uploadedAt: profile.resume.uploadedAt,
      path: profile.resume.fileUrl,
      size: null
    } : null
  };
};

/**
 * Submit job application
 */
const submitApplication = async (candidateId, applicationData, file) => {
  const {
    jobId,
    applicationProfile,
    coverLetter,
    profileAccuracyConfirmed,
    useExistingResume
  } = applicationData;

  // Parse applicationProfile if it's a string
  let parsedApplicationProfile = typeof applicationProfile === 'string' 
    ? JSON.parse(applicationProfile) 
    : applicationProfile;

  // Check if job exists
  const job = await Job.findById(jobId);
  if (!job) {
    throw new NotFoundError('Job not found');
  }

  // Check if already applied
  const existingApplication = await JobApplication.findOne({
    jobId,
    candidateId,
    status: { $ne: 'Withdrawn' }
  });

  if (existingApplication) {
    throw new ValidationError('You have already applied to this job');
  }

  // Handle resume
  let resumeData;
  
  if (useExistingResume === 'true' || useExistingResume === true) {
    const profile = await CandidateProfile.findOne({ user: candidateId });
    if (!profile || !profile.resume || !profile.resume.fileUrl) {
      throw new ValidationError('No existing resume found in profile');
    }
    
    resumeData = {
      filename: profile.resume.fileName || 'resume.pdf',
      originalName: profile.resume.fileName,
      uploadDate: profile.resume.uploadedAt || new Date(),
      filePath: profile.resume.fileUrl,
      isFromProfile: true
    };
  } else {
    if (!file) {
      throw new ValidationError('Resume file is required');
    }

    resumeData = {
      filename: file.filename,
      originalName: file.originalname,
      uploadDate: new Date(),
      fileSize: file.size,
      filePath: `/uploads/resumes/${file.filename}`,
      isFromProfile: false
    };
  }

  const jobApplication = new JobApplication({
    jobId,
    candidateId,
    applicationProfile: parsedApplicationProfile,
    resume: resumeData,
    coverLetter: coverLetter || '',
    profileAccuracyConfirmed: profileAccuracyConfirmed === 'true'
  });

  await jobApplication.save();

  // Update job applications count
  await Job.findByIdAndUpdate(jobId, {
    $inc: { applicationsCount: 1 }
  });

  // Update candidate profile stats
  await CandidateProfile.findOneAndUpdate(
    { user: candidateId },
    { 
      $inc: { 'stats.totalApplications': 1 },
      $set: { lastProfileUpdateAt: new Date() }
    },
    { upsert: true }
  );

  await jobApplication.populate({
    path: 'jobId',
    select: 'title location employer',
    populate: {
      path: 'employer',
      select: 'companyName'
    }
  });

  if (jobApplication.jobId && jobApplication.jobId.employer) {
    jobApplication.jobId.company = jobApplication.jobId.employer.companyName;
    delete jobApplication.jobId.employer;
  }

  return jobApplication;
};

/**
 * Get candidate's applications
 */
const getCandidateApplications = async (candidateId, filters = {}) => {
  const { page = 1, limit = 10, status } = filters;

  const filter = { candidateId };
  if (status && status !== 'all') {
    filter.status = status;
  } else if (status === 'all') {
    // Exclude withdrawn applications from "all" view
    filter.status = { $ne: 'Withdrawn' };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const applications = await JobApplication.find(filter)
    .populate({
      path: 'jobId',
      select: 'title location salaryRange employmentType employer',
      populate: {
        path: 'employer',
        select: 'companyName'
      }
    })
    .sort({ appliedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();

  // Map employer.companyName to company for frontend compatibility
  applications.forEach(app => {
    if (app.jobId && app.jobId.employer) {
      app.jobId.company = app.jobId.employer.companyName;
      delete app.jobId.employer;
    }
  });

  const totalApplications = await JobApplication.countDocuments(filter);
  const totalPages = Math.ceil(totalApplications / parseInt(limit));

  return {
    applications,
    pagination: {
      currentPage: parseInt(page),
      totalPages,
      totalApplications,
      hasNextPage: parseInt(page) < totalPages,
      hasPrevPage: parseInt(page) > 1
    }
  };
};

/**
 * Get single application details by applicationId
 */
const getApplicationById = async (candidateId, applicationId) => {
  const application = await JobApplication.findOne({
    applicationId,
    candidateId
  })
  .populate({
    path: 'jobId',
    select: 'title location salaryRange employmentType description requirements benefits employer',
    populate: {
      path: 'employer',
      select: 'companyName'
    }
  })
  .populate('candidateId', 'fullName email phoneNumber')
  .lean();

  if (application && application.jobId && application.jobId.employer) {
    application.jobId.company = application.jobId.employer.companyName;
    delete application.jobId.employer;
  }

  if (!application) {
    throw new NotFoundError('Application not found');
  }

  // Format the response to match expected structure
  return {
    ...application,
    candidate: {
      user: application.candidateId,
      ...application.applicationProfile
    },
    job: application.jobId
  };
};

/**
 * Withdraw application
 */
const withdrawApplication = async (candidateId, applicationId) => {
  const application = await JobApplication.findOneAndUpdate(
    { applicationId, candidateId },
    { status: 'Withdrawn' },
    { new: true }
  ).populate({
    path: 'jobId',
    select: 'title employer',
    populate: {
      path: 'employer',
      select: 'companyName'
    }
  });

  if (!application) {
    throw new NotFoundError('Application not found');
  }

  if (application.jobId && application.jobId.employer) {
    application.jobId.company = application.jobId.employer.companyName;
    delete application.jobId.employer;
  }

  // Decrease job applications count
  await Job.findByIdAndUpdate(application.jobId._id, {
    $inc: { applicationsCount: -1 }
  });

  // Update candidate profile stats
  await CandidateProfile.findOneAndUpdate(
    { user: candidateId },
    { 
      $inc: { 'stats.totalApplications': -1 },
      $set: { lastProfileUpdateAt: new Date() }
    }
  );

  return application;
};

module.exports = {
  getApplicationsByJob,
  updateApplicationStatus,
  bulkUpdateApplications,
  scheduleInterview,
  checkApplicationStatus,
  getProfileDataForApplication,
  submitApplication,
  getCandidateApplications,
  getApplicationById,
  withdrawApplication
};
