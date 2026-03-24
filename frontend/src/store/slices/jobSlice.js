import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import jobApi from '../../services/api/jobApi';

/**
 * Job Redux Slice - manages job state
 * Uses centralized API service for all HTTP requests
 */

// ==========================================
// Async Thunks
// ==========================================

export const fetchEmployerJobs = createAsyncThunk(
  'job/fetchEmployerJobs',
  async (filters = {}, { rejectWithValue }) => {
    try {
      return await jobApi.getJobs(filters);
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const fetchJobs = createAsyncThunk(
  'job/fetchJobs',
  async (filters = {}, { rejectWithValue }) => {
    try {
      return await jobApi.getJobs(filters);
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const fetchJobById = createAsyncThunk(
  'job/fetchJobById',
  async (jobId, { rejectWithValue }) => {
    try {
      return await jobApi.getJobById(jobId);
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const createJob = createAsyncThunk(
  'job/createJob',
  async (jobData, { rejectWithValue }) => {
    try {
      return await jobApi.createJob(jobData);
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const updateJob = createAsyncThunk(
  'job/updateJob',
  async ({ jobId, jobData }, { rejectWithValue }) => {
    try {
      return await jobApi.updateJob(jobId, jobData);
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const updateJobStatus = createAsyncThunk(
  'job/updateJobStatus',
  async ({ jobId, status }, { rejectWithValue }) => {
    try {
      return await jobApi.updateJobStatus(jobId, status);
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const deleteJob = createAsyncThunk(
  'job/deleteJob',
  async (jobId, { rejectWithValue }) => {
    try {
      await jobApi.deleteJob(jobId);
      return { id: jobId };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

// ==========================================
// Slice
// ==========================================

export const fetchFilterOptions = createAsyncThunk(
  'job/fetchFilterOptions',
  async (_, { rejectWithValue }) => {
    try {
      return await jobApi.getFilterOptions();
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

// ==========================================
// Slice
// ==========================================

const initialState = {
  currentJob: null,
  loading: false,
  error: null,
  validationErrors: {},
  jobs: [],
  jobsLoading: false,
  jobsError: null,
  currentJobLoading: false,
  currentJobError: null,
  
  // Filter state
  filterOptions: {
    locations: [],
    departments: [],
    experienceLevels: [],
    employmentTypes: []
  },
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalJobs: 0,
    hasNextPage: false,
    hasPrevPage: false
  },
  filters: {
    search: '',
    location: '',
    department: '',
    experienceLevel: '',
    employmentType: '',
    salaryMin: '',
    salaryMax: '',
    postedDate: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  },
  filtersLoading: false
};

const jobSlice = createSlice({
  name: 'job',
  initialState,
  reducers: {
    setJobData: (state, action) => {
      state.currentJob = { ...state.currentJob, ...action.payload };
    },
    clearJobData: (state) => {
      state.currentJob = null;
      state.error = null;
      state.validationErrors = {};
    },
    setValidationErrors: (state, action) => {
      state.validationErrors = action.payload;
    },
    clearValidationErrors: (state) => {
      state.validationErrors = {};
    },
    // Filter reducers
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = {
        search: '',
        location: '',
        department: '',
        experienceLevel: '',
        employmentType: '',
        salaryMin: '',
        salaryMax: '',
        postedDate: '',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };
    },
    setCurrentPage: (state, action) => {
      state.pagination.currentPage = action.payload;
    },
    setSearchTerm: (state, action) => {
      state.filters.search = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch job by ID
      .addCase(fetchJobById.pending, (state) => {
        state.currentJobLoading = true;
        state.currentJobError = null;
      })
      .addCase(fetchJobById.fulfilled, (state, action) => {
        state.currentJobLoading = false;
        state.currentJob = action.payload;
      })
      .addCase(fetchJobById.rejected, (state, action) => {
        state.currentJobLoading = false;
        state.currentJobError = action.payload || 'Failed to load job';
      })
      // Fetch employer jobs
      .addCase(fetchEmployerJobs.pending, (state) => {
        state.jobsLoading = true;
        state.jobsError = null;
      })
      .addCase(fetchEmployerJobs.fulfilled, (state, action) => {
        state.jobsLoading = false;
        if (action.payload?.jobs) {
          state.jobs = action.payload.jobs;
          if (action.payload.pagination) {
            state.pagination = action.payload.pagination;
          }
        } else {
          state.jobs = action.payload || [];
        }
        state.jobsError = null;
      })
      .addCase(fetchEmployerJobs.rejected, (state, action) => {
        state.jobsLoading = false;
        state.jobsError = action.payload || 'Failed to fetch jobs';
      })
      // Fetch public jobs
      .addCase(fetchJobs.pending, (state) => {
        state.jobsLoading = true;
        state.jobsError = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.jobsLoading = false;
        // Handle pagination response structure if present, otherwise assume array
        if (action.payload.jobs) {
            state.jobs = action.payload.jobs;
            state.pagination = action.payload.pagination;
            // Merge filters if returned
            if (action.payload.filters) {
                state.filters = { ...state.filters, ...action.payload.filters };
            }
        } else {
            state.jobs = action.payload || [];
        }
        state.jobsError = null;
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.jobsLoading = false;
        state.jobsError = action.payload || 'Failed to fetch jobs';
      })
      // Fetch filter options
      .addCase(fetchFilterOptions.pending, (state) => {
        state.filtersLoading = true;
      })
      .addCase(fetchFilterOptions.fulfilled, (state, action) => {
        state.filtersLoading = false;
        state.filterOptions = action.payload;
      })
      .addCase(fetchFilterOptions.rejected, (state, action) => {
        state.filtersLoading = false;
        // Don't set global error for filter options failure
      })
      // Create job
      .addCase(createJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createJob.fulfilled, (state, action) => {
        state.loading = false;
        state.currentJob = action.payload;
        state.error = null;
        state.validationErrors = {};
        if (action.payload?._id) {
          state.jobs = [action.payload, ...state.jobs];
        }
      })
      .addCase(createJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to create job';
      })
      // Update job
      .addCase(updateJob.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateJob.fulfilled, (state, action) => {
        state.loading = false;
        state.currentJob = action.payload;
        state.error = null;
        state.validationErrors = {};
        // Update in jobs list if present
        const index = state.jobs.findIndex(job => job._id === action.payload._id);
        if (index !== -1) {
          state.jobs[index] = action.payload;
        }
      })
      .addCase(updateJob.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to update job';
      })
      // Update job status
      .addCase(updateJobStatus.fulfilled, (state, action) => {
        const updatedJob = action.payload;
        const updatedJobId = updatedJob?._id || action.meta.arg.jobId;
        state.jobs = state.jobs.map((job) =>
          job._id === updatedJobId 
            ? { ...job, status: updatedJob?.status ?? action.meta.arg.status } 
            : job
        );
        // Update current job if it's the same
        if (state.currentJob?._id === updatedJobId) {
          state.currentJob.status = updatedJob?.status ?? action.meta.arg.status;
        }
      })
      // Delete job
      .addCase(deleteJob.fulfilled, (state, action) => {
        const deletedJobId = action.payload.id;
        state.jobs = state.jobs.filter((job) => job._id !== deletedJobId);
        // Clear current job if it was deleted
        if (state.currentJob?._id === deletedJobId) {
          state.currentJob = null;
        }
      });
  },
});

export const {
  setJobData,
  clearJobData,
  setValidationErrors,
  clearValidationErrors,
  setFilters,
  resetFilters,
  setCurrentPage,
  setSearchTerm
} = jobSlice.actions;

export default jobSlice.reducer;
