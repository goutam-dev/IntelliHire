const mongoose = require('mongoose');
const JobApplication = require('../models/JobApplication');
const Job = require('../models/Job');
const CandidateProfile = require('../models/CandidateProfile');
const User = require('../models/User');
const EmployerProfile = require('../models/EmployerProfile');
const { NotFoundError, ValidationError, ForbiddenError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
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
const getApplicationsByJob = async (jobId, filters = {}, userId) => {
  const { status = 'all', search = '', sort = 'newest' } = filters;

  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw new ValidationError('Invalid jobId');
  }

  // Verify ownership
  const user = await User.findOne({ clerkUserId: userId });
  if (!user) throw new ForbiddenError('User not found');
  
  const employerProfile = await EmployerProfile.findOne({ user: user._id });
  if (!employerProfile) throw new ForbiddenError('Employer profile not found');

  const job = await Job.findById(jobId);
  if (!job) throw new NotFoundError('Job not found');

  if (job.employer.toString() !== employerProfile._id.toString()) {
    throw new ForbiddenError('You do not have permission to view applications for this job');
  }

  // Build base query
  const query = { jobId: jobId }; 
  if (status && status !== 'all') {
    query.status = status;
  }

  // Fetch all matching applications with full population
  let applications = await JobApplication.find(query)
    .populate({
      path: 'candidateId', 
      select: 'fullName email phoneNumber' 
    })
    .populate({ path: 'jobId', select: 'title department' })
    .lean();

  // Map to expected structure
  applications = applications.map(app => {
    return {
      ...app,
      candidate: {
        user: app.candidateId,
        ...app.applicationProfile 
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
const updateApplicationStatus = async (applicationId, statusData, userId) => {
  const { status, notes, feedback } = statusData;

  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw new ValidationError('Invalid applicationId');
  }
  if (!status) {
    throw new ValidationError('Status is required');
  }

  const application = await JobApplication.findById(applicationId).populate('jobId');
  if (!application) {
    throw new NotFoundError('Application not found');
  }

  // Verify ownership
  const user = await User.findOne({ clerkUserId: userId });
  if (!user) throw new ForbiddenError('User not found');
  
  const employerProfile = await EmployerProfile.findOne({ user: user._id });
  if (!employerProfile) throw new ForbiddenError('Employer profile not found');

  if (!application.jobId || application.jobId.employer.toString() !== employerProfile._id.toString()) {
    throw new ForbiddenError('You do not have permission to update this application');
  }

  // Track old status for stats update
  const oldStatus = application.status;
  
  application.status = status;
  if (feedback) application.employerNotes = feedback;
  else if (notes) application.employerNotes = notes; 
  
  await application.save();

  // Update candidate profile stats if status changed
  if (oldStatus !== status) {
    const statUpdates = {};
    
    // Decrement old status count
    if (oldStatus === 'Applied') {
      statUpdates['stats.pending'] = -1;
    } else if (['Shortlisted', 'Interview Scheduled'].includes(oldStatus)) {
      statUpdates['stats.shortlisted'] = -1;
    } else if (oldStatus === 'Rejected') {
      statUpdates['stats.rejected'] = -1;
    }
    
    // Increment new status count
    if (status === 'Applied') {
      statUpdates['stats.pending'] = (statUpdates['stats.pending'] || 0) + 1;
    } else if (['Shortlisted', 'Interview Scheduled'].includes(status)) {
      statUpdates['stats.shortlisted'] = (statUpdates['stats.shortlisted'] || 0) + 1;
    } else if (status === 'Rejected') {
      statUpdates['stats.rejected'] = (statUpdates['stats.rejected'] || 0) + 1;
    }
    
    if (Object.keys(statUpdates).length > 0) {
      await CandidateProfile.findOneAndUpdate(
        { user: application.candidateId },
        { $inc: statUpdates },
        { upsert: false }
      );
    }
  }

  const populated = await application.populate([
    { path: 'candidateId', select: 'fullName email phoneNumber' },
    { path: 'jobId', select: 'title department' },
  ]);

  return populated;
};

/**
 * Bulk update application statuses
 */
const bulkUpdateApplications = async (ids, statusData, userId) => {
  const { status, notes, feedback } = statusData;

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new ValidationError('ids array is required');
  }
  if (!status) {
    throw new ValidationError('Status is required');
  }

  // Verify ownership for ALL applications
  const user = await User.findOne({ clerkUserId: userId });
  if (!user) throw new ForbiddenError('User not found');
  
  const employerProfile = await EmployerProfile.findOne({ user: user._id });
  if (!employerProfile) throw new ForbiddenError('Employer profile not found');

  const objectIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  const applications = await JobApplication.find({ _id: { $in: objectIds } }).populate('jobId');

  for (const app of applications) {
    if (!app.jobId || app.jobId.employer.toString() !== employerProfile._id.toString()) {
       // Skip or throw? Let's skip to avoid breaking bulk op if one is bad, or throw to be strict.
       // Strict is safer.
       throw new ForbiddenError(`You do not have permission to update application ${app._id}`);
    }
  }

  for (const app of applications) {
    app.status = status;
    if (feedback) app.employerNotes = feedback;
    else if (notes) app.employerNotes = notes;
    await app.save();
  }

  return { updated: applications.length };
};

/**
 * Schedule interview for application
 */
const scheduleInterview = async (applicationId, interviewData, userId) => {
  const { scheduledAt, instructions } = interviewData;

  if (!mongoose.Types.ObjectId.isValid(applicationId)) {
    throw new ValidationError('Invalid applicationId');
  }

  const application = await JobApplication.findById(applicationId).populate('jobId');
  if (!application) {
    throw new NotFoundError('Application not found');
  }

  // Verify ownership
  const user = await User.findOne({ clerkUserId: userId });
  if (!user) throw new ForbiddenError('User not found');
  
  const employerProfile = await EmployerProfile.findOne({ user: user._id });
  if (!employerProfile) throw new ForbiddenError('Employer profile not found');

  if (!application.jobId || application.jobId.employer.toString() !== employerProfile._id.toString()) {
    throw new ForbiddenError('You do not have permission to schedule interview for this application');
  }

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

  // Check if job exists and is active
  const job = await Job.findById(jobId);
  if (!job) {
    throw new NotFoundError('Job not found');
  }
  
  if (job.status !== 'active') {
    throw new ValidationError('This job is no longer accepting applications');
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
    
    // Copy the resume file to application-specific folder to ensure it persists
    // even if candidate deletes their profile resume
    const sourceFilePath = path.join(__dirname, '..', profile.resume.fileUrl);
    const timestamp = Date.now();
    const fileExtension = path.extname(profile.resume.fileName || 'resume.pdf');
    const newFilename = `app-${candidateId}-${timestamp}${fileExtension}`;
    const destPath = path.join(__dirname, '..', 'uploads', 'applications', newFilename);
    
    // Ensure applications directory exists
    const appDir = path.join(__dirname, '..', 'uploads', 'applications');
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }
    
    // Copy file if source exists
    if (fs.existsSync(sourceFilePath)) {
      fs.copyFileSync(sourceFilePath, destPath);
    } else {
      throw new ValidationError('Resume file not found in profile');
    }
    
    resumeData = {
      filename: newFilename,
      originalName: profile.resume.fileName || 'resume.pdf',
      uploadDate: new Date(),
      filePath: `/uploads/applications/${newFilename}`,
      isFromProfile: true
    };
  } else {
    if (!file) {
      throw new ValidationError('Resume file is required');
    }
    
    // Move uploaded file to application-specific folder for consistency
    const timestamp = Date.now();
    const fileExtension = path.extname(file.originalname);
    const newFilename = `app-${candidateId}-${timestamp}${fileExtension}`;
    const sourcePath = file.path;
    const destPath = path.join(__dirname, '..', 'uploads', 'applications', newFilename);
    
    // Ensure applications directory exists
    const appDir = path.join(__dirname, '..', 'uploads', 'applications');
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }
    
    // Move file from temp location to applications folder
    if (fs.existsSync(sourcePath)) {
      fs.renameSync(sourcePath, destPath);
    }

    resumeData = {
      filename: newFilename,
      originalName: file.originalname,
      uploadDate: new Date(),
      fileSize: file.size,
      filePath: `/uploads/applications/${newFilename}`,
      isFromProfile: false
    };
  }

  try {
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
        $inc: { 'stats.totalApplications': 1, 'stats.pending': 1 },
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
  } catch (error) {
    // Delete uploaded/copied file if application submission failed
    if (resumeData && resumeData.filePath) {
      const filePath = path.join(__dirname, '..', resumeData.filePath);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          logger.info(`Deleted application resume after failed submission: ${filePath}`);
        } catch (unlinkError) {
          logger.error('Error deleting application resume after failed submission:', unlinkError);
        }
      }
    }
    throw error;
  }
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
  try {
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

    // Update candidate profile stats based on current status
    const statUpdates = { 'stats.totalApplications': -1 };
    if (application.status === 'Applied') {
      statUpdates['stats.pending'] = -1;
    } else if (['Shortlisted', 'Interview Scheduled'].includes(application.status)) {
      statUpdates['stats.shortlisted'] = -1;
    } else if (application.status === 'Rejected') {
      statUpdates['stats.rejected'] = -1;
    }
    
    await CandidateProfile.findOneAndUpdate(
      { user: candidateId },
      { 
        $inc: statUpdates,
        $set: { lastProfileUpdateAt: new Date() }
      }
    );

    return application;
  } catch (error) {
    throw error;
  }
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
