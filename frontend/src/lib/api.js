import axios from 'axios';

/**
 * Centralized Axios instance with interceptors for authentication and error handling
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

// Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies
});

/**
 * Request interceptor - adds authentication token to requests
 */
api.interceptors.request.use(
  async (config) => {
    // Get Clerk token from window
    if (window.Clerk) {
      try {
        const session = await window.Clerk.session;
        if (session) {
          const token = await session.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
      } catch (error) {
        console.error('Error getting Clerk token:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - handles common errors
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle specific error cases
    if (error.response) {
      const { status } = error.response;
      
      // Handle 401 Unauthorized
      if (status === 401) {
        // Token expired or invalid - redirect to sign in
        if (window.Clerk) {
          window.Clerk.signOut();
        }
        window.location.href = '/sign-in';
      }
      
      // Handle 403 Forbidden
      if (status === 403) {
        console.error('Access forbidden');
      }
      
      // Handle 404 Not Found
      if (status === 404) {
        console.error('Resource not found');
      }
      
      // Handle 500 Internal Server Error
      if (status === 500) {
        console.error('Server error occurred');
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
