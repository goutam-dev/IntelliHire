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
const buildFilters = ({
  status,
  search,
  employerId,
  location,
  department,
  experienceLevel,
  employmentType,
  salaryMin,
  salaryMax,
  postedDate,
}) => {
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
      { description: { $regex: search, $options: 'i' } },
      { requiredSkills: { $elemMatch: { $regex: search, $options: 'i' } } },
    ];
  }

  if (location) {
    filters.location = { $regex: `^${location}$`, $options: 'i' };
  }

  if (department) {
    filters.department = { $regex: `^${department}$`, $options: 'i' };
  }

  if (experienceLevel) {
    filters.experienceLevel = experienceLevel;
  }

  if (employmentType) {
    filters.employmentType = employmentType;
  }

  const min = Number(salaryMin);
  const max = Number(salaryMax);
  if (!Number.isNaN(min) && min > 0) {
    filters['salaryRange.min'] = { $gte: min };
  }
  if (!Number.isNaN(max) && max > 0) {
    filters['salaryRange.max'] = { $lte: max };
  }

  if (postedDate) {
    const now = new Date();
    let fromDate = null;

    if (postedDate === '24h') {
      fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (postedDate === '7d') {
      fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (postedDate === '30d') {
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    if (fromDate) {
      filters.createdAt = { $gte: fromDate };
    }
  }

  return filters;
};

const getSortStage = (sortBy = 'createdAt', sortOrder = 'desc') => {
  const direction = sortOrder === 'asc' ? 1 : -1;
  const sortMap = {
    createdAt: { createdAt: direction },
    publishedAt: { publishedAt: direction, createdAt: -1 },
    applicationDeadline: { applicationDeadline: direction, createdAt: -1 },
    title: { title: direction },
    experienceLevel: { experienceLevel: direction, createdAt: -1 },
    salaryMin: { 'salaryRange.min': direction, createdAt: -1 },
    salaryMax: { 'salaryRange.max': direction, createdAt: -1 },
  };

  return sortMap[sortBy] || sortMap.createdAt;
};

const normalizeApplicationDeadline = (rawDeadline) => {
  if (!rawDeadline) return null;

  if (typeof rawDeadline === 'string') {
    const dateOnlyMatch = rawDeadline.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      const year = Number(dateOnlyMatch[1]);
      const month = Number(dateOnlyMatch[2]) - 1;
      const day = Number(dateOnlyMatch[3]);
      return new Date(year, month, day, 23, 59, 59, 999);
    }
  }

  const parsedDate = new Date(rawDeadline);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
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

  const hasExplicitPagination = Boolean(queryFilters.page || queryFilters.limit);
  const page = Math.max(1, Number(queryFilters.page) || 1);
  const limit = hasExplicitPagination
    ? Math.min(100, Math.max(1, Number(queryFilters.limit) || 10))
    : 1000;
  const skip = (page - 1) * limit;
  const sortStage = getSortStage(queryFilters.sortBy, queryFilters.sortOrder);

  const totalJobs = await Job.countDocuments(filters);

  const jobs = await Job.aggregate([
    { $match: filters },
    { $sort: sortStage },
    { $skip: skip },
    { $limit: limit },
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

  const totalPages = Math.max(1, Math.ceil(totalJobs / limit));

  return {
    jobs,
    pagination: {
      currentPage: page,
      totalPages,
      totalJobs,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      limit,
    },
    filters: {
      search: queryFilters.search || '',
      location: queryFilters.location || '',
      department: queryFilters.department || '',
      experienceLevel: queryFilters.experienceLevel || '',
      employmentType: queryFilters.employmentType || '',
      salaryMin: queryFilters.salaryMin || '',
      salaryMax: queryFilters.salaryMax || '',
      postedDate: queryFilters.postedDate || '',
      sortBy: queryFilters.sortBy || 'createdAt',
      sortOrder: queryFilters.sortOrder || 'desc',
    },
  };
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
  if (job.employer && job.employer.companyName) {
    job.company = job.employer.companyName;
    // Remove sensitive/internal data
    if (job.employer.user) delete job.employer.user;
    delete job.employer;
  } else {
    job.company = 'Company Name Unavailable';
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
  
  const { sanitizeString, isValidStringArray, isValidEnum, isValidDate } = require('../utils/validators');
  const { EXPERIENCE_LEVELS, EMPLOYMENT_TYPES, JOB_STATUS } = require('../config/constants');

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
  
  // Validate skills array
  if (!Array.isArray(requiredSkills) || requiredSkills.length === 0) {
    throw new ValidationError('Required skills must be a non-empty array');
  }
  
  if (!isValidStringArray(requiredSkills, 1, 50)) {
    throw new ValidationError('Required skills must contain 1-50 valid skill names');
  }
  
  // Validate experience level
  const experienceLevels = ['entry', 'mid', 'senior', 'expert'];
  if (!experienceLevels.includes(experienceLevel)) {
    throw new ValidationError(`Experience level must be one of: ${experienceLevels.join(', ')}`);
  }
  
  // Validate employment type
  const employmentTypes = ['full-time', 'part-time', 'contract', 'remote'];
  if (!employmentTypes.includes(employmentType)) {
    throw new ValidationError(`Employment type must be one of: ${employmentTypes.join(', ')}`);
  }
  
  // Validate job status
  const jobStatuses = ['draft', 'active', 'closed', 'archived'];
  if (status && !jobStatuses.includes(status)) {
    throw new ValidationError(`Status must be one of: ${jobStatuses.join(', ')}`);
  }
  
  // Validate salary range if provided
  if (salaryRange) {
    if (salaryRange.min && salaryRange.max && salaryRange.min > salaryRange.max) {
      throw new ValidationError('Minimum salary cannot be greater than maximum salary');
    }
    if (salaryRange.min && salaryRange.min < 0) {
      throw new ValidationError('Salary cannot be negative');
    }
  }
  
  // Validate application deadline if provided
  let normalizedApplicationDeadline;
  if (applicationDeadline) {
    normalizedApplicationDeadline = normalizeApplicationDeadline(applicationDeadline);
    if (!normalizedApplicationDeadline || !isValidDate(normalizedApplicationDeadline)) {
      throw new ValidationError('Invalid application deadline date');
    }
    if (normalizedApplicationDeadline < new Date()) {
      throw new ValidationError('Application deadline cannot be in the past');
    }
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

  // Sanitize text inputs
  const sanitizedTitle = sanitizeString(title, 200);
  const sanitizedDepartment = department ? sanitizeString(department, 100) : undefined;
  const sanitizedDescription = sanitizeString(description, 5000);
  const sanitizedLocation = sanitizeString(location, 200);
  const sanitizedEducationReqs = educationRequirements ? sanitizeString(educationRequirements, 500) : undefined;
  const sanitizedSkills = requiredSkills.map(skill => sanitizeString(skill, 50)).filter(s => s.length > 0);

  const job = await Job.create({
    employer: employerProfile._id,
    title: sanitizedTitle,
    department: sanitizedDepartment,
    description: sanitizedDescription,
    requiredSkills: sanitizedSkills,
    experienceLevel,
    educationRequirements: sanitizedEducationReqs,
    location: sanitizedLocation,
    employmentType,
    salaryRange,
    applicationDeadline: normalizedApplicationDeadline,
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

/**
 * Get filter options for job browsing
 * Returns distinct values for locations, departments, experience levels, and employment types
 */
const getFilterOptions = async () => {
  // Only get options from active jobs
  const activeJobsFilter = { status: 'active' };

  const countByField = async (field) => {
    return Job.aggregate([
      { $match: activeJobsFilter },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
      { $project: { _id: 0, value: '$_id', count: 1 } },
      { $sort: { value: 1 } },
    ]);
  };

  const [locations, departmentsFromDb, experienceCounts, employmentCounts] = await Promise.all([
    Job.distinct('location', activeJobsFilter),
    countByField('department'),
    countByField('experienceLevel'),
    countByField('employmentType'),
  ]);

  // Filter out null/undefined/empty values and sort
  const cleanAndSort = (arr) => arr.filter(val => val && val.trim()).sort();

  const EXPERIENCE_LEVELS = ['entry', 'mid', 'senior', 'expert'];
  const EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract', 'remote'];

  const mergeWithDefaults = (defaults, counts) => {
    const countMap = new Map((counts || []).map(item => [item.value, item.count]));
    return defaults.map(value => ({
      value,
      count: countMap.get(value) || 0,
    }));
  };

  return {
    locations: cleanAndSort(locations),
    departments: departmentsFromDb.filter(item => item?.value && String(item.value).trim()),
    experienceLevels: mergeWithDefaults(EXPERIENCE_LEVELS, experienceCounts),
    employmentTypes: mergeWithDefaults(EMPLOYMENT_TYPES, employmentCounts),
  };
};

/**
 * Increment job views count
 */
const incrementJobViews = async (jobId, viewerClerkUserId = null) => {
  const job = await Job.findById(jobId).select('status metadata.views').lean();

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  if (job.status !== 'active') {
    throw new NotFoundError('Job not found');
  }

  if (viewerClerkUserId) {
    const viewer = await User.findOne({ clerkUserId: viewerClerkUserId }).select('role').lean();
    if (viewer?.role === 'employer') {
      return { viewsCount: job.metadata?.views || 0 };
    }
  }

  const updatedJob = await Job.findByIdAndUpdate(
    jobId,
    { $inc: { 'metadata.views': 1 } },
    { new: true, projection: { 'metadata.views': 1 } }
  ).lean();

  return { viewsCount: updatedJob?.metadata?.views || 0 };
};

module.exports = {
  getJobsByEmployer,
  getJobById,
  incrementJobViews,
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
  getFilterOptions,
};
