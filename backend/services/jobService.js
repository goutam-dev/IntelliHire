const mongoose = require('mongoose');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const User = require('../models/User');
const EmployerProfile = require('../models/EmployerProfile');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const { validateRequiredFields } = require('../utils/validators');

/**
 * Job service - handles all job-related business logic
 */

/**
 * Build filter object for job queries
 */
const buildFilters = ({ status, search, employerId }) => {
  const filters = {};

  if (status && status !== 'all') {
    filters.status = status;
  }

  if (employerId) {
    filters.employer = employerId;
  }

  if (search) {
    filters.$or = [
      { title: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } },
    ];
  }

  return filters;
};

/**
 * Get jobs by employer (with optional filters)
 */
const getJobsByEmployer = async (clerkUserId, queryFilters = {}) => {
  // Get employer profile ID from authenticated user
  const user = await User.findOne({ clerkUserId });
  let isEmployer = false;
  
  if (user && user.role === 'employer') {
    isEmployer = true;
    const employerProfile = await EmployerProfile.findOne({ user: user._id });
    if (employerProfile) {
      // Override any employerId from query params with authenticated employer
      queryFilters.employerId = employerProfile._id;
    }
  }

  let filters = buildFilters(queryFilters);
  
  // If not an employer, only show active jobs (hide draft, archived, closed)
  if (!isEmployer) {
    filters.status = 'active';
  }

  // Ensure aggregation matches by ObjectId for employer
  if (filters.employer && typeof filters.employer === 'string') {
    filters.employer = new mongoose.Types.ObjectId(filters.employer);
  }

  const jobs = await Job.aggregate([
    { $match: filters },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: 'jobapplications',
        let: { jobId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$jobId', '$$jobId'] } } },
          { $count: 'count' },
        ],
        as: 'appCounts',
      },
    },
    {
      $lookup: {
        from: 'employerprofiles',
        localField: 'employer',
        foreignField: '_id',
        as: 'employerProfile',
      },
    },
    {
      $addFields: {
        applicationsCount: {
          $ifNull: [{ $arrayElemAt: ['$appCounts.count', 0] }, 0],
        },
        company: { $arrayElemAt: ['$employerProfile.companyName', 0] },
      },
    },
    { $project: { appCounts: 0, employerProfile: 0 } },
  ]);

  return jobs;
};

/**
 * Get job by ID
 */
const getJobById = async (jobId, userId = null) => {
  const job = await Job.findById(jobId)
    .populate('employer', 'companyName user') // Populate user to check ownership
    .lean();
  
  if (!job) {
    throw new NotFoundError('Job not found');
  }

  // Visibility Check
  if (job.status !== 'active') {
    let canView = false;
    
    if (userId) {
      const user = await User.findOne({ clerkUserId: userId });
      if (user && job.employer && job.employer.user) {
        if (job.employer.user.toString() === user._id.toString()) {
          canView = true;
        }
      }
    }

    if (!canView) {
      throw new NotFoundError('Job not found'); // Hide non-active jobs
    }
  }
  
  // Map employer.companyName to company for frontend compatibility
  if (job.employer) {
    job.company = job.employer.companyName;
    // Remove sensitive/internal data
    delete job.employer.user; 
    delete job.employer;
  }
  
  return job;
};

/**
 * Create a new job
 */
const createJob = async (clerkUserId, jobData) => {
  const {
    title,
    department,
    description,
    requiredSkills,
    experienceLevel,
    educationRequirements,
    location,
    employmentType,
    salaryRange,
    applicationDeadline,
    status = 'draft',
  } = jobData;

  // Validate required fields
  const validation = validateRequiredFields(jobData, [
    'title',
    'description',
    'requiredSkills',
    'experienceLevel',
    'location',
    'employmentType',
  ]);

  if (!validation.valid) {
    throw new ValidationError(validation.message);
  }

  // Get employer profile ID from authenticated user
  const user = await User.findOne({ clerkUserId });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const employerProfile = await EmployerProfile.findOne({ user: user._id });
  if (!employerProfile) {
    throw new NotFoundError('Employer profile not found');
  }

  const job = await Job.create({
    employer: employerProfile._id,
    title,
    department,
    description,
    requiredSkills,
    experienceLevel,
    educationRequirements,
    location,
    employmentType,
    salaryRange,
    applicationDeadline,
    status,
    publishedAt: status === 'active' ? new Date() : undefined,
    lastStatusChangeAt: new Date(),
  });

  return job;
};

/**
 * Update a job
 */
const updateJob = async (jobId, updates) => {
  const job = await Job.findByIdAndUpdate(jobId, updates, {
    new: true,
    runValidators: true,
  });

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  return job;
};

/**
 * Update job status
 */
const updateJobStatus = async (jobId, status) => {
  if (!status) {
    throw new ValidationError('Status is required');
  }

  const job = await Job.findById(jobId);
  if (!job) {
    throw new NotFoundError('Job not found');
  }

  job.status = status;
  job.lastStatusChangeAt = new Date();
  if (status === 'active' && !job.publishedAt) {
    job.publishedAt = new Date();
  }

  await job.save();
  return job;
};

/**
 * Delete a job
 */
const deleteJob = async (jobId) => {
  const job = await Job.findByIdAndDelete(jobId);
  if (!job) {
    throw new NotFoundError('Job not found');
  }
  
  // Delete associated applications
  await JobApplication.deleteMany({ jobId });
  
  return job;
};

module.exports = {
  getJobsByEmployer,
  getJobById,
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
};
