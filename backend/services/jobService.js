const mongoose = require('mongoose');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const User = require('../models/User');
const EmployerProfile = require('../models/EmployerProfile');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const { validateRequiredFields } = require('../utils/validators');

const DELETE_IMMUTABLE_APPLICATION_STATUSES = ['Rejected', 'Hired', 'Withdrawn', 'Job Deleted'];

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeJobTitle = (value = '') => String(value).trim().replace(/\s+/g, ' ').toLowerCase();

const buildTitleMatchRegex = (normalizedTitle = '') => {
  if (!normalizedTitle) return null;
  const tokens = normalizedTitle.split(' ').map(escapeRegex);
  const pattern = `^${tokens.join('\\s+')}$`;
  return new RegExp(pattern, 'i');
};

const findDuplicateJobTitle = async (employerId, normalizedTitle, excludeJobId = null) => {
  if (!normalizedTitle) return null;
  const titleRegex = buildTitleMatchRegex(normalizedTitle);
  const query = {
    employer: employerId,
    isDeleted: { $ne: true },
    $or: [
      { titleKey: normalizedTitle },
      ...(titleRegex ? [{ title: { $regex: titleRegex } }] : []),
    ],
  };

  if (excludeJobId) {
    query._id = { $ne: excludeJobId };
  }

  return Job.findOne(query).select('_id title status').lean();
};

/**
 * Build an array of regexes – one per keyword in the search query.
 * Each keyword is matched independently so "mern developer" will find jobs
 * that contain both "mern" AND "developer" in any order, in any field.
 */
const buildSearchRegexes = (value = '') => {
  const normalized = String(value).trim().replace(/\s+/g, ' ');
  if (!normalized) return [];

  const keywords = normalized.split(' ').filter(k => k.length > 0);
  return keywords.map(k => new RegExp(escapeRegex(k), 'i'));
};

const resolveEmployerProfileFromClerkUser = async (clerkUserId) => {
  const user = await User.findOne({ clerkUserId });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const employerProfile = await EmployerProfile.findOne({ user: user._id });
  if (!employerProfile) {
    throw new NotFoundError('Employer profile not found');
  }

  return employerProfile;
};

const getOwnedJobOrThrow = async (jobId, clerkUserId) => {
  const employerProfile = await resolveEmployerProfileFromClerkUser(clerkUserId);
  const job = await Job.findById(jobId);
  if (!job || job.isDeleted) {
    throw new NotFoundError('Job not found');
  }

  if (String(job.employer) !== String(employerProfile._id)) {
    throw new ValidationError('You do not have permission to modify this job');
  }

  return { job, employerProfile };
};

/**
 * Job service - handles all job-related business logic
 */

/**
 * Build filter object for job queries
 */
const buildFilters = ({
  status,
  employerId,
  location,
  department,
  experienceLevel,
  employmentType,
  salaryMin,
  salaryMax,
  postedDate,
}) => {
  const filters = {
    isDeleted: { $ne: true },
  };

  if (status && status !== 'all') {
    filters.status = status;
  }

  if (employerId) {
    filters.employer = employerId;
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
  const searchRegexes = buildSearchRegexes(queryFilters.search);
  const { search: _ignoredSearch, ...filtersWithoutSearch } = queryFilters;

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

  let filters = buildFilters(filtersWithoutSearch);
  
  // If not an employer, only show active jobs (hide draft, archived, closed)
  if (!isEmployer) {
    const includeClosed = queryFilters.includeClosed === true || queryFilters.includeClosed === 'true';
    if (includeClosed) {
      if (queryFilters.status && queryFilters.status !== 'all' && ['active', 'closed'].includes(queryFilters.status)) {
        filters.status = queryFilters.status;
      } else {
        filters.status = { $in: ['active', 'closed'] };
      }
    } else {
      filters.status = 'active';
    }
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

  // Build keyword-level search: each keyword must appear in at least one field,
  // and ALL keywords must be present (AND logic across keywords, OR across fields).
  // e.g. "mern developer" → job must contain "mern" somewhere AND "developer" somewhere.
  const searchStage = searchRegexes.length > 0
    ? {
        $match: searchRegexes.length === 1
          ? {
              $or: [
                { title: { $regex: searchRegexes[0] } },
                { department: { $regex: searchRegexes[0] } },
                { description: { $regex: searchRegexes[0] } },
                { requiredSkills: { $elemMatch: { $regex: searchRegexes[0] } } },
                { company: { $regex: searchRegexes[0] } },
              ],
            }
          : {
              $and: searchRegexes.map(regex => ({
                $or: [
                  { title: { $regex: regex } },
                  { department: { $regex: regex } },
                  { description: { $regex: regex } },
                  { requiredSkills: { $elemMatch: { $regex: regex } } },
                  { company: { $regex: regex } },
                ],
              })),
            },
      }
    : null;

  const basePipeline = [
    { $match: filters },
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
        company: { $arrayElemAt: ['$employerProfile.companyName', 0] },
        companyLogoUrl: { $arrayElemAt: ['$employerProfile.logoUrl', 0] },
      },
    },
  ];

  if (searchStage) {
    basePipeline.push(searchStage);
  }

  const totalJobsResult = await Job.aggregate([
    ...basePipeline,
    { $count: 'count' },
  ]);
  const totalJobs = totalJobsResult[0]?.count || 0;

  const jobs = await Job.aggregate([
    ...basePipeline,
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
      $addFields: {
        applicationsCount: {
          $ifNull: [{ $arrayElemAt: ['$appCounts.count', 0] }, 0],
        },
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
    .populate('employer', 'companyName logoUrl user') // Populate user to check ownership
    .lean();
  
  if (!job || job.isDeleted) {
    throw new NotFoundError('Job not found');
  }

  // Visibility Check
  if (job.status !== 'active') {
    let canView = false;
    
    if (userId) {
      const user = await User.findOne({ clerkUserId: userId });
      if (user && job.employer && job.employer.user && job.employer.user.toString() === user._id.toString()) {
        canView = true;
      }

      // Candidates can still view jobs they already applied to, even if the posting is no longer active.
      if (!canView && user && user.role === 'candidate') {
        const hasApplied = await JobApplication.exists({
          jobId: job._id,
          candidateId: user._id,
          status: { $ne: 'Withdrawn' },
        });
        canView = Boolean(hasApplied);
      }
    }

    if (!canView) {
      throw new NotFoundError('Job not found'); // Hide non-active jobs
    }
  }
  
  // Map employer.companyName to company for frontend compatibility
  if (job.employer && job.employer.companyName) {
    job.company = job.employer.companyName;
    job.companyLogoUrl = job.employer.logoUrl || null;
    // Remove sensitive/internal data
    if (job.employer.user) delete job.employer.user;
    delete job.employer;
  } else {
    job.company = 'Company Name Unavailable';
    job.companyLogoUrl = null;
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

  const normalizedExperienceLevel = typeof experienceLevel === 'string'
    ? experienceLevel.trim()
    : experienceLevel;
  const normalizedEmploymentType = typeof employmentType === 'string'
    ? employmentType.trim()
    : employmentType;
  
  const { sanitizeString, isValidStringArray, isValidDate } = require('../utils/validators');

  const isPublishing = status === 'active';

  // Enforce full required fields only for published jobs.
  if (isPublishing) {
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
  }
  
  // Validate skills only when provided in drafts; require them when publishing.
  if (requiredSkills !== undefined) {
    if (!Array.isArray(requiredSkills)) {
      throw new ValidationError('Required skills must be an array');
    }

    if (isPublishing && requiredSkills.length === 0) {
      throw new ValidationError('Required skills must be a non-empty array');
    }

    if (requiredSkills.length > 0 && !isValidStringArray(requiredSkills, 1, 50)) {
      throw new ValidationError('Required skills must contain 1-50 valid skill names');
    }
  }
  
  // Validate experience level when provided.
  const experienceLevels = ['no-experience', 'entry', 'mid', 'senior', 'expert'];
  if (
    normalizedExperienceLevel !== undefined
    && normalizedExperienceLevel !== ''
    && !experienceLevels.includes(normalizedExperienceLevel)
  ) {
    throw new ValidationError(`Experience level must be one of: ${experienceLevels.join(', ')}`);
  }
  
  // Validate employment type when provided.
  const employmentTypes = ['full-time', 'part-time', 'contract', 'remote'];
  if (
    normalizedEmploymentType !== undefined
    && normalizedEmploymentType !== ''
    && !employmentTypes.includes(normalizedEmploymentType)
  ) {
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
  const sanitizedTitle = title !== undefined ? sanitizeString(title, 200) : undefined;
  const sanitizedDepartment = department ? sanitizeString(department, 100) : undefined;
  const sanitizedDescription = description !== undefined ? sanitizeString(description, 5000) : undefined;
  const sanitizedLocation = location !== undefined ? sanitizeString(location, 200) : undefined;
  const sanitizedEducationReqs = educationRequirements ? sanitizeString(educationRequirements, 500) : undefined;
  const sanitizedSkills = Array.isArray(requiredSkills)
    ? requiredSkills.map(skill => sanitizeString(skill, 50)).filter(s => s.length > 0)
    : undefined;

  const normalizedTitleKey = sanitizedTitle ? normalizeJobTitle(sanitizedTitle) : undefined;
  if (normalizedTitleKey) {
    const duplicate = await findDuplicateJobTitle(employerProfile._id, normalizedTitleKey);
    if (duplicate) {
      throw new ValidationError(`You already have a job with the title "${sanitizedTitle}". Please use a different title.`);
    }
  }

  const job = await Job.create({
    employer: employerProfile._id,
    title: sanitizedTitle,
    titleKey: normalizedTitleKey || undefined,
    department: sanitizedDepartment,
    description: sanitizedDescription,
    requiredSkills: sanitizedSkills,
    experienceLevel: normalizedExperienceLevel || undefined,
    educationRequirements: sanitizedEducationReqs,
    location: sanitizedLocation,
    employmentType: normalizedEmploymentType || undefined,
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
const updateJob = async (jobId, updates, clerkUserId) => {
  const { job, employerProfile } = await getOwnedJobOrThrow(jobId, clerkUserId);
  const { sanitizeString } = require('../utils/validators');

  if (updates.title !== undefined) {
    const sanitizedTitle = sanitizeString(updates.title, 200);
    const normalizedTitleKey = sanitizedTitle ? normalizeJobTitle(sanitizedTitle) : undefined;

    if (normalizedTitleKey) {
      const duplicate = await findDuplicateJobTitle(employerProfile._id, normalizedTitleKey, job._id);
      if (duplicate) {
        throw new ValidationError(`You already have a job with the title "${sanitizedTitle}". Please use a different title.`);
      }
    }

    updates.title = sanitizedTitle;
    updates.titleKey = normalizedTitleKey || undefined;
  } else if (updates.titleKey !== undefined) {
    delete updates.titleKey;
  }

  Object.assign(job, updates);
  await job.save();
  return job;
};

/**
 * Update job status
 */
const updateJobStatus = async (jobId, status, clerkUserId) => {
  if (!status) {
    throw new ValidationError('Status is required');
  }

  const allowedStatuses = ['draft', 'active', 'closed', 'archived'];
  if (!allowedStatuses.includes(status)) {
    throw new ValidationError(`Status must be one of: ${allowedStatuses.join(', ')}`);
  }

  const { job } = await getOwnedJobOrThrow(jobId, clerkUserId);

  if (job.isDeleted) {
    throw new ValidationError('Deleted jobs cannot be reactivated or updated');
  }

  job.status = status;
  job.lastStatusChangeAt = new Date();
  if (status === 'active' && !job.publishedAt) {
    job.publishedAt = new Date();
  }
  if (status === 'closed') {
    job.closedAt = new Date();
  }
  if (status === 'active') {
    job.closedAt = null;
  }

  await job.save();

  return job;
};

/**
 * Delete a job
 */
const deleteJob = async (jobId, clerkUserId) => {
  const { job } = await getOwnedJobOrThrow(jobId, clerkUserId);

  if (job.isDeleted) {
    return job;
  }

  job.isDeleted = true;
  job.deletedAt = new Date();
  job.status = 'archived';
  job.lastStatusChangeAt = new Date();
  await job.save();

  await JobApplication.updateMany(
    {
      jobId: job._id,
      $or: [
        { status: { $nin: DELETE_IMMUTABLE_APPLICATION_STATUSES } },
        { status: /^job\s*closed$/i },
      ],
    },
    {
      $set: {
        status: 'Job Deleted',
        lastUpdated: new Date(),
      },
    }
  );

  return job;
};

/**
 * Get filter options for job browsing
 * Returns distinct values for locations, departments, experience levels, and employment types
 */
const getFilterOptions = async () => {
  // Only get options from active jobs
  const activeJobsFilter = { status: 'active', isDeleted: { $ne: true } };

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

  const EXPERIENCE_LEVELS = ['no-experience', 'entry', 'mid', 'senior', 'expert'];
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
  const job = await Job.findById(jobId).select('status isDeleted metadata.views').lean();

  if (!job) {
    throw new NotFoundError('Job not found');
  }

  if (job.isDeleted || job.status !== 'active') {
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
