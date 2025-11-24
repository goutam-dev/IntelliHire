import api from '../../lib/api';

/**
 * Job API service - handles all job-related API calls
 */

/**
 * Get all jobs with optional filters
 */
export const getJobs = async (filters = {}) => {
  const response = await api.get('/jobs', { params: filters });
  return response.data;
};

/**
 * Get job by ID
 */
export const getJobById = async (jobId) => {
  const response = await api.get(`/jobs/${jobId}`);
  return response.data;
};

/**
 * Create a new job
 */
export const createJob = async (jobData) => {
  const response = await api.post('/jobs', jobData);
  return response.data;
};

/**
 * Update a job
 */
export const updateJob = async (jobId, jobData) => {
  const response = await api.put(`/jobs/${jobId}`, jobData);
  return response.data;
};

/**
 * Update job status
 */
export const updateJobStatus = async (jobId, status) => {
  const response = await api.patch(`/jobs/${jobId}/status`, { status });
  return response.data;
};

/**
 * Delete a job
 */
export const deleteJob = async (jobId) => {
  const response = await api.delete(`/jobs/${jobId}`);
  return response.data;
};

/**
 * Get filter options (locations, departments, etc.)
 */
export const getFilterOptions = async () => {
  const response = await api.get('/jobs/filters/options');
  return response.data;
};

export default {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
  getFilterOptions,
};
