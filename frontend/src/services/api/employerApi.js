import api from '../../lib/api';

/**
 * Employer API service - handles all employer-related API calls
 */

/**
 * Get employer profile
 */
export const getEmployerProfile = async () => {
  const response = await api.get('/employer/profile');
  return response.data;
};

/**
 * Update employer profile
 */
export const updateEmployerProfile = async (profileData) => {
  const response = await api.put('/employer/profile', profileData);
  return response.data;
};

/**
 * Upload employer logo
 */
export const uploadEmployerLogo = async (file) => {
  const formData = new FormData();
  formData.append('logo', file);
  
  const response = await api.post('/employer/profile/logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Get dashboard statistics
 */
export const getDashboardStats = async () => {
  const response = await api.get('/employer/dashboard/stats');
  return response.data;
};

export default {
  getEmployerProfile,
  updateEmployerProfile,
  uploadEmployerLogo,
  getDashboardStats,
};
