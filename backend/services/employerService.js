const User = require('../models/User');
const EmployerProfile = require('../models/EmployerProfile');
const { NotFoundError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * Employer service - handles all employer-related business logic
 */

/**
 * Get employer profile by Clerk user ID
 */
const getEmployerProfileByClerkId = async (clerkUserId) => {
  logger.debug(`Fetching employer profile for Clerk user: ${clerkUserId}`);
  const user = await User.findOne({ clerkUserId });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const profile = await EmployerProfile.findOne({ user: user._id }).populate(
    'user',
    'fullName email role phoneNumber'
  );

  if (!profile) {
    throw new NotFoundError('Employer profile not found');
  }

  return profile;
};

/**
 * Update employer profile
 */
const updateEmployerProfile = async (clerkUserId, updateData) => {
  logger.debug(`Updating employer profile for Clerk user: ${clerkUserId}`);

  const user = await User.findOne({ clerkUserId });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Update user fields if provided
  const { fullName, phoneNumber } = updateData;
  if (fullName) user.fullName = fullName;
  if (phoneNumber) user.phoneNumber = phoneNumber;
  await user.save();

  // Update employer profile
  const allowedFields = [
    'companyName',
    'industry',
    'companyWebsite',
    'companySize',
    'companyDescription',
    'contactEmail',
    'location',
    'phoneNumber',
    'socialLinks',
  ];

  const profileUpdate = {};
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      profileUpdate[field] = updateData[field];
    }
  });

  const profile = await EmployerProfile.findOneAndUpdate(
    { user: user._id },
    { $set: profileUpdate },
    { new: true, upsert: true }
  ).populate('user', 'fullName email role phoneNumber');

  if (!profile) {
    throw new NotFoundError('Employer profile not found');
  }

  return profile;
};

/**
 * Get dashboard statistics for employer
 */
const getDashboardStats = async (clerkUserId) => {
  logger.debug(`Fetching dashboard stats for Clerk user: ${clerkUserId}`);

  const mongoose = require('mongoose');
  const Job = require('../models/Job');
  const JobApplication = require('../models/JobApplication');

  const user = await User.findOne({ clerkUserId });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const employerProfile = await EmployerProfile.findOne({ user: user._id });
  if (!employerProfile) {
    throw new NotFoundError('Employer profile not found');
  }

  // Job statistics
  const totalJobs = await Job.countDocuments({ employer: employerProfile._id });
  const activeJobs = await Job.countDocuments({
    employer: employerProfile._id,
    status: 'active',
  });
  const draftJobs = await Job.countDocuments({
    employer: employerProfile._id,
    status: 'draft',
  });
  const closedJobs = await Job.countDocuments({
    employer: employerProfile._id,
    status: 'closed',
  });
  const archivedJobs = await Job.countDocuments({
    employer: employerProfile._id,
    status: 'archived',
  });

  // Get all job IDs for this employer
  const jobs = await Job.find({ employer: employerProfile._id }).select('_id');
  const jobIds = jobs.map((job) => job._id);

  // Application statistics
  const totalApplications = await JobApplication.countDocuments({
    jobId: { $in: jobIds },
  });
  
  const uniqueCandidateIds = await JobApplication.distinct('candidateId', {
    jobId: { $in: jobIds },
  });
  const uniqueCandidatesCount = uniqueCandidateIds.length;

  const pendingApplications = await JobApplication.countDocuments({
    jobId: { $in: jobIds },
    status: 'Applied',
  });

  // New applications (last 24 hours)
  // Use _id for timestamp check as it's more reliable if createdAt is missing
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const hexSeconds = Math.floor(oneDayAgo.getTime() / 1000)
    .toString(16)
    .padStart(8, '0');
  const minId = new mongoose.Types.ObjectId(hexSeconds + '0000000000000000');

  const newApplications = await JobApplication.countDocuments({
    jobId: { $in: jobIds },
    _id: { $gte: minId },
  });

  // Recent applications (top 5)
  const recentApplications = await JobApplication.find({
    jobId: { $in: jobIds },
  })
    .sort({ _id: -1 }) // Sort by _id (creation time)
    .limit(5)
    .populate({
      path: 'candidateId',
      select: 'fullName email'
    })
    .populate('jobId', 'title')
    .lean();

  // Upcoming Interviews (Pending AI interviews or scheduled ones)
  const upcomingApplications = await JobApplication.find({
    jobId: { $in: jobIds },
    status: { $in: ['Interview Scheduled'] },
    interviewWindowStart: { $exists: true }
  })
    .sort({ interviewWindowStart: 1, _id: -1 })
    .limit(5)
    .populate({
      path: 'candidateId',
      select: 'fullName email'
    })
    .populate('jobId', 'title')
    .lean();

  // Transform to match frontend expectations
  const formattedApplications = recentApplications.map(app => ({
    ...app,
    candidate: {
      user: {
        fullName: app.candidateId?.fullName || app.applicationProfile?.personalInfo?.name || 'Candidate',
        email: app.candidateId?.email || app.applicationProfile?.personalInfo?.email
      }
    },
    job: {
      _id: app.jobId?._id,
      title: app.jobId?.title || 'Job Title'
    },
    createdAt: app.createdAt || app.appliedAt
  }));

  const formattedUpcoming = upcomingApplications.map(app => ({
    ...app,
    candidate: {
      user: {
        fullName: app.candidateId?.fullName || app.applicationProfile?.personalInfo?.name || 'Candidate',
        email: app.candidateId?.email || app.applicationProfile?.personalInfo?.email
      }
    },
    job: {
      _id: app.jobId?._id,
      title: app.jobId?.title || 'Job Title'
    },
    createdAt: app.createdAt || app.appliedAt,
    interviewWindowStart: app.interviewWindowStart,
    interviewWindowEnd: app.interviewWindowEnd
  }));

  return {
    totalJobs,
    activeJobs,
    draftJobs,
    closedJobs,
    archivedJobs,
    totalApplications,
    uniqueCandidates: uniqueCandidatesCount,
    pendingReviews: pendingApplications,
    newApplications,
    recentApplications: formattedApplications,
    upcomingInterviews: formattedUpcoming,
  };
};

/**
 * Upload employer logo
 */
const uploadEmployerLogo = async (clerkUserId, filename) => {
  logger.info(`Uploading logo for employer: ${clerkUserId}, filename: ${filename}`);

  const user = await User.findOne({ clerkUserId });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const relativeUrl = `/uploads/logos/${filename}`;

  // Find and update the employer profile
  const profile = await EmployerProfile.findOneAndUpdate(
    { user: user._id },
    { logoUrl: relativeUrl },
    { new: true, runValidators: true, upsert: true }
  );

  if (!profile) {
    throw new NotFoundError('Employer profile not found');
  }

  return { logoUrl: relativeUrl };
};

module.exports = {
  getEmployerProfileByClerkId,
  updateEmployerProfile,
  getDashboardStats,
  uploadEmployerLogo,
};
