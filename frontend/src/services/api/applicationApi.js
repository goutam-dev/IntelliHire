import api from '../../lib/api';

/**
 * Application API service - handles all application-related API calls
 */

/**
 * Get applications by job ID with optional filters
 */
export const getApplicationsByJob = async (jobId, filters = {}) => {
  const response = await api.get(`/employer/jobs/${jobId}/applications`, {
    params: filters,
  });
  return response.data;
};

/**
 * Update application status
 */
export const updateApplicationStatus = async (applicationId, statusData) => {
  const response = await api.patch(
    `/employer/applications/${applicationId}/status`,
    statusData
  );
  return response.data;
};

/**
 * Bulk update application statuses
 */
export const bulkUpdateApplicationStatus = async (ids, statusData) => {
  const response = await api.patch('/employer/applications/bulk/status', {
    ids,
    ...statusData,
  });
  return response.data;
};

/**
 * Schedule interview for application
 */
export const scheduleInterview = async (applicationId, interviewData) => {
  const response = await api.post(
    `/employer/applications/${applicationId}/interview`,
    interviewData
  );
  return response.data;
};

/**
 * Get interview report for an application (employer only)
 */
export const getInterviewReport = async (applicationId) => {
  const response = await api.get(
    `/employer/applications/${applicationId}/interview-report`
  );
  return response.data?.data || response.data;
};

/**
 * Request re-interview (candidate action)
 */
export const requestReInterview = async (applicationId, data) => {
  const response = await api.post(
    `/job-applications/${applicationId}/request-reinterview`,
    data
  );
  return response.data;
};

/**
 * Approve re-interview request (employer action)
 */
export const approveReInterview = async (applicationId, data) => {
  const response = await api.post(
    `/employer/applications/${applicationId}/approve-reinterview`,
    data
  );
  return response.data;
};

/**
 * Deny re-interview request (employer action)
 */
export const denyReInterview = async (applicationId, data) => {
  const response = await api.post(
    `/employer/applications/${applicationId}/deny-reinterview`,
    data
  );
  return response.data;
};

export default {
  getApplicationsByJob,
  updateApplicationStatus,
  bulkUpdateApplicationStatus,
  scheduleInterview,
  getInterviewReport,
  requestReInterview,
  approveReInterview,
  denyReInterview,
};
