import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

// Async thunks
export const checkApplicationStatus = createAsyncThunk(
  'jobApplications/checkStatus',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await api.get(`/job-applications/check/${jobId}`);
      return { jobId, ...response.data.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  },
  {
    condition: (jobId, { getState }) => {
      const state = getState()?.jobApplications;
      if (!state || !jobId) return false;

      // Skip duplicate checks if status already exists or request is in-flight.
      if (state.applicationStatuses?.[jobId]) return false;
      if (state.statusChecksInFlight?.[jobId]) return false;

      return true;
    },
  }
);

export const fetchProfileData = createAsyncThunk(
  'jobApplications/fetchProfileData',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/job-applications/profile-data');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const submitJobApplication = createAsyncThunk(
  'jobApplications/submit',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post('/job-applications/apply', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const fetchMyApplications = createAsyncThunk(
  'jobApplications/fetchMyApplications',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/job-applications/my-applications', { params });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const withdrawApplication = createAsyncThunk(
  'jobApplications/withdraw',
  async (applicationId, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/job-applications/${applicationId}/withdraw`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Initial state
const initialState = {
  // Application status checks
  applicationStatuses: {}, // { jobId: { hasApplied: boolean, application: {...} } }
  statusChecksInFlight: {},
  
  // Profile data for applications
  profileData: null,
  
  // My applications
  myApplications: [],
  applicationsPagination: {
    currentPage: 1,
    totalPages: 1,
    totalApplications: 0,
    hasNextPage: false,
    hasPrevPage: false
  },
  
  // UI states
  loading: {
    checkingStatus: false,
    fetchingProfile: false,
    submitting: false,
    fetchingApplications: false,
    withdrawing: false
  },
  
  error: null,
  
  // Current application being processed
  currentApplication: null,
  
  // Success messages
  successMessage: null
};

const jobApplicationsSlice = createSlice({
  name: 'jobApplications',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
    setCurrentApplication: (state, action) => {
      state.currentApplication = action.payload;
    },
    clearCurrentApplication: (state) => {
      state.currentApplication = null;
    },
    updateApplicationStatus: (state, action) => {
      const { jobId, status } = action.payload;
      if (state.applicationStatuses[jobId]) {
        state.applicationStatuses[jobId].application.status = status;
      }
    },
    forceRefreshApplicationStatus: (state, action) => {
      const { jobId } = action.payload;
      // Remove the cached status to force a fresh check
      if (state.applicationStatuses[jobId]) {
        delete state.applicationStatuses[jobId];
      }
      if (state.statusChecksInFlight[jobId]) {
        delete state.statusChecksInFlight[jobId];
      }
    },
    clearApplicationsCache: (state) => {
      // Clear applications cache to force fresh fetch
      state.myApplications = [];
      state.applicationsPagination = {
        currentPage: 1,
        totalPages: 1,
        totalApplications: 0,
        hasNextPage: false,
        hasPrevPage: false
      };
    }
  },
  extraReducers: (builder) => {
    builder
      // Check application status
      .addCase(checkApplicationStatus.pending, (state, action) => {
        state.loading.checkingStatus = true;
        state.error = null;
        const jobId = action.meta.arg;
        if (jobId) {
          state.statusChecksInFlight[jobId] = true;
        }
      })
      .addCase(checkApplicationStatus.fulfilled, (state, action) => {
        state.loading.checkingStatus = false;
        const { jobId, ...statusData } = action.payload;
        if (jobId && state.statusChecksInFlight[jobId]) {
          delete state.statusChecksInFlight[jobId];
        }
        state.applicationStatuses[jobId] = statusData;
      })
      .addCase(checkApplicationStatus.rejected, (state, action) => {
        state.loading.checkingStatus = false;
        const jobId = action.meta.arg;
        if (jobId && state.statusChecksInFlight[jobId]) {
          delete state.statusChecksInFlight[jobId];
        }
        state.error = action.payload;
      })
      
      // Fetch profile data
      .addCase(fetchProfileData.pending, (state) => {
        state.loading.fetchingProfile = true;
        state.error = null;
      })
      .addCase(fetchProfileData.fulfilled, (state, action) => {
        state.loading.fetchingProfile = false;
        state.profileData = action.payload;
      })
      .addCase(fetchProfileData.rejected, (state, action) => {
        state.loading.fetchingProfile = false;
        state.error = action.payload;
      })
      
      // Submit application
      .addCase(submitJobApplication.pending, (state) => {
        state.loading.submitting = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(submitJobApplication.fulfilled, (state, action) => {
        state.loading.submitting = false;
        state.currentApplication = action.payload;
        state.successMessage = 'Application submitted successfully!';
        
        // Update application status for the job - handle both possible jobId formats
        const jobId = action.payload.jobId || action.payload.job?._id;
        if (jobId) {
          // Force update the application status to ensure UI reflects the change
          state.applicationStatuses[jobId] = {
            hasApplied: true,
            application: {
              applicationId: action.payload.applicationId,
              status: action.payload.status || 'Applied',
              appliedAt: action.payload.appliedAt,
              appliedAgo: action.payload.appliedAgo || 'just now'
            }
          };
          
          // Also clear any previous withdrawn status for this job
          // This ensures the UI updates correctly after re-application
          console.log(`Redux: Updated application status for job ${jobId}:`, state.applicationStatuses[jobId]);
        }
      })
      .addCase(submitJobApplication.rejected, (state, action) => {
        state.loading.submitting = false;
        state.error = action.payload;
      })
      
      // Fetch my applications
      .addCase(fetchMyApplications.pending, (state) => {
        state.loading.fetchingApplications = true;
        state.error = null;
      })
      .addCase(fetchMyApplications.fulfilled, (state, action) => {
        state.loading.fetchingApplications = false;
        state.myApplications = action.payload.applications;
        state.applicationsPagination = action.payload.pagination;
      })
      .addCase(fetchMyApplications.rejected, (state, action) => {
        state.loading.fetchingApplications = false;
        state.error = action.payload;
      })
      
      // Withdraw application
      .addCase(withdrawApplication.pending, (state) => {
        state.loading.withdrawing = true;
        state.error = null;
      })
      .addCase(withdrawApplication.fulfilled, (state, action) => {
        state.loading.withdrawing = false;
        
        // Update the application in myApplications
        const updatedApplication = action.payload;
        const index = state.myApplications.findIndex(
          app => app.applicationId === updatedApplication.applicationId
        );
        if (index !== -1) {
          state.myApplications[index] = updatedApplication;
        }
        
        // Update application status
        const jobId = updatedApplication.jobId._id;
        if (state.applicationStatuses[jobId]) {
          state.applicationStatuses[jobId].application.status = 'Withdrawn';
        }
        
        state.successMessage = 'Application withdrawn successfully';
      })
      .addCase(withdrawApplication.rejected, (state, action) => {
        state.loading.withdrawing = false;
        state.error = action.payload;
      });
  }
});

export const {
  clearError,
  clearSuccessMessage,
  setCurrentApplication,
  clearCurrentApplication,
  updateApplicationStatus,
  forceRefreshApplicationStatus,
  clearApplicationsCache
} = jobApplicationsSlice.actions;

export default jobApplicationsSlice.reducer;
