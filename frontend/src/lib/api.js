import axios from 'axios';

/**
 * Centralized Axios instance with interceptors for authentication and error handling
 */

// Validate environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
let isAuthRecoveryInProgress = false;

const shouldForceSignOut = (error) => {
  const status = error?.response?.status;
  const errorMessage = String(
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    ''
  ).toLowerCase();

  // Never sign out on transient failures.
  if (!status || status === 429 || status >= 500) {
    return false;
  }

  if (status !== 401) {
    return false;
  }

  // Sign out only for definitive auth/session invalidation messages.
  return (
    errorMessage.includes('no session token') ||
    errorMessage.includes('invalid session') ||
    errorMessage.includes('authentication failed') ||
    errorMessage.includes('invalid token') ||
    errorMessage.includes('session token')
  );
};

// Warn in development if critical env vars are missing
if (import.meta.env.MODE === 'development') {
  if (!CLERK_KEY) {
    console.warn('⚠️  VITE_CLERK_PUBLISHABLE_KEY is not set. Authentication may not work.');
  }
}

// Create Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies
  timeout: 30000, // 30 second timeout for requests
});

/**
 * Request interceptor - adds authentication token to requests
 */
api.interceptors.request.use(
  async (config) => {
    // Get Clerk token from window with proper error handling
    if (window.Clerk) {
      try {
        // Wait for Clerk to be loaded
        if (!window.Clerk.loaded) {
          await new Promise(resolve => {
            const checkLoaded = setInterval(() => {
              if (window.Clerk.loaded) {
                clearInterval(checkLoaded);
                resolve();
              }
            }, 100);
            // Timeout after 5 seconds
            setTimeout(() => {
              clearInterval(checkLoaded);
              resolve();
            }, 5000);
          });
        }

        const session = window.Clerk.session;
        if (session) {
          const token = await session.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
      } catch (error) {
        console.error('Error getting Clerk token:', error);
        // Don't fail the request, continue without token
        // Backend will reject if auth is required
      }
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
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
      if (status === 401 && shouldForceSignOut(error) && !isAuthRecoveryInProgress) {
        isAuthRecoveryInProgress = true;

        // Only sign out when backend confirms session/token is truly invalid.
        if (window.Clerk) {
          window.Clerk.signOut().catch((signOutError) => {
            console.error('Clerk signOut failed during auth recovery:', signOutError);
          }).finally(() => {
            window.location.href = '/sign-in';
          });
          return Promise.reject(error);
        }

        window.location.href = '/sign-in';
      }

      if (status === 429) {
        console.warn('Rate limited by API. Keeping current session and retrying later.');
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
