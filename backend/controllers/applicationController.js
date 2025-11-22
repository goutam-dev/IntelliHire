const applicationService = require('../services/applicationService');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * Application controller - thin controller that delegates to service layer
 */

/**
 * List applications by job ID with optional filters
 */
exports.listApplicationsByJob = asyncHandler(async (req, res) => {
  const { jobId } = req.params;
  const filters = req.query;

  const applications = await applicationService.getApplicationsByJob(
    jobId,
    filters
  );

  res.json(applications);
});

/**
 * Update application status
 */
exports.updateApplicationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const statusData = req.body;

  const application = await applicationService.updateApplicationStatus(
    id,
    statusData
  );

  res.json(application);
});

/**
 * Bulk update application statuses
 */
exports.bulkUpdateStatus = asyncHandler(async (req, res) => {
  const { ids, status, notes, feedback } = req.body;

  const result = await applicationService.bulkUpdateApplications(ids, {
    status,
    notes,
    feedback,
  });

  res.json(result);
});

/**
 * Schedule interview for application
 */
exports.scheduleInterview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const interviewData = req.body;

  const application = await applicationService.scheduleInterview(
    id,
    interviewData
  );

  res.json(application);
});
