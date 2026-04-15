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
    filters,
    req.auth.userId
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
    statusData,
    req.auth.userId
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
  }, req.auth.userId);

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
    interviewData,
    req.auth.userId
  );

  res.json(application);
});

/**
 * Get interview report for an application (employer only)
 */
exports.getInterviewReport = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const report = await applicationService.getInterviewReport(
    id,
    req.auth.userId
  );

  res.json({ success: true, data: report });
});

/**
 * Approve a re-interview request (employer action)
 */
exports.approveReInterview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const interviewData = req.body;

  const application = await applicationService.approveReInterview(
    id,
    interviewData,
    req.auth.userId
  );

  res.json({ success: true, data: application });
});

/**
 * Deny a re-interview request (employer action)
 */
exports.denyReInterview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  const application = await applicationService.denyReInterview(
    id,
    note || '',
    req.auth.userId
  );

  res.json({ success: true, data: application });
});
