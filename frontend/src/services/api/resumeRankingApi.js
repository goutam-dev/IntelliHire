import api from '../../lib/api';

/**
 * Resume Ranking API Service
 * Handles all AI-powered resume analysis endpoints
 */

/**
 * Analyze a resume for a job application
 * @param {string} applicationId - Application ID
 * @returns {Promise} Analysis result
 */
export const analyzeResume = async (applicationId) => {
  try {
    const response = await api.post(`/resume-ranking/analyze/${applicationId}`);
    return response.data;
  } catch (error) {
    console.error('Error analyzing resume:', error);
    throw error;
  }
};

/**
 * Get analysis results for an application
 * @param {string} applicationId - Application ID
 * @returns {Promise} Analysis data
 */
export const getAnalysisResults = async (applicationId) => {
  try {
    const response = await api.get(`/resume-ranking/results/${applicationId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching analysis results:', error);
    throw error;
  }
};

/**
 * Get detailed analysis breakdown
 * @param {string} applicationId - Application ID
 * @returns {Promise} Detailed analysis
 */
export const getDetailedAnalysis = async (applicationId) => {
  try {
    const response = await api.get(`/resume-ranking/detailed/${applicationId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching detailed analysis:', error);
    throw error;
  }
};

/**
 * Get analysis status
 * @param {string} applicationId - Application ID
 * @returns {Promise} Status information
 */
export const getAnalysisStatus = async (applicationId) => {
  try {
    const response = await api.get(`/resume-ranking/status/${applicationId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching analysis status:', error);
    throw error;
  }
};

/**
 * Get top candidates for a job (ranked by AI score)
 * @param {string} jobId - Job ID
 * @param {number} limit - Number of candidates to return (default: 10)
 * @returns {Promise} Top candidates list
 */
export const getTopCandidates = async (jobId, limit = 10) => {
  try {
    const response = await api.get(`/resume-ranking/top-candidates/${jobId}`, {
      params: { limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching top candidates:', error);
    throw error;
  }
};

/**
 * Get job statistics with AI scoring breakdown
 * @param {string} jobId - Job ID
 * @returns {Promise} Statistics data
 */
export const getJobStatistics = async (jobId) => {
  try {
    const response = await api.get(`/resume-ranking/statistics/${jobId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching job statistics:', error);
    throw error;
  }
};

/**
 * Re-analyze a resume (force refresh)
 * @param {string} applicationId - Application ID
 * @returns {Promise} Updated analysis
 */
export const reanalyzeResume = async (applicationId) => {
  try {
    const response = await api.post(`/resume-ranking/reanalyze/${applicationId}`);
    return response.data;
  } catch (error) {
    console.error('Error re-analyzing resume:', error);
    throw error;
  }
};

/**
 * Batch analyze all applications for a job
 * @param {string} jobId - Job ID
 * @returns {Promise} Batch analysis results
 */
export const batchAnalyzeApplications = async (jobId) => {
  try {
    const response = await api.post(`/resume-ranking/batch-analyze/${jobId}`);
    return response.data;
  } catch (error) {
    console.error('Error batch analyzing applications:', error);
    throw error;
  }
};
