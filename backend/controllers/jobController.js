const jobService = require('../services/jobService');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * Job controller - thin controller that delegates to service layer
 */

/**
 * List jobs with optional filters
 */
exports.listJobs = asyncHandler(async (req, res) => {
  const jobs = await jobService.getJobsByEmployer(req.auth?.userId, req.query);
  res.json(jobs);
});

/**
 * Get job by ID
 */
exports.getJobById = asyncHandler(async (req, res) => {
  const job = await jobService.getJobById(req.params.jobId, req.auth?.userId);
  res.json(job);
});

/**
 * Create a new job
 */
exports.createJob = asyncHandler(async (req, res) => {
  const job = await jobService.createJob(req.auth.userId, req.body);
  res.status(201).json(job);
});

/**
 * Update a job
 */
exports.updateJob = asyncHandler(async (req, res) => {
  const job = await jobService.updateJob(req.params.jobId, req.body);
  res.json(job);
});

/**
 * Update job status
 */
exports.updateJobStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const job = await jobService.updateJobStatus(req.params.jobId, status);
  res.json(job);
});

/**
 * Delete a job
 */
exports.deleteJob = asyncHandler(async (req, res) => {
  await jobService.deleteJob(req.params.jobId);
  res.status(204).send();
});
