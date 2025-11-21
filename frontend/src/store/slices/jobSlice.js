import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

const handleResponse = async (response, fallbackMessage) => {
  if (!response.ok) {
    let message = fallbackMessage;
    try {
      const error = await response.json();
      message = error?.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return response.status === 204 ? null : response.json();
};

// Async thunks for API calls
export const fetchEmployerJobs = createAsyncThunk(
  'job/fetchEmployerJobs',
  async ({ token }, { rejectWithValue }) => {
    try {
      const url = new URL(`${API_BASE_URL}/jobs`);
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return await handleResponse(response, 'Failed to fetch jobs');
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch jobs');
    }
  }
);

export const createJob = createAsyncThunk(
  'job/createJob',
  async ({ jobData, token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(jobData),
      });
      return await handleResponse(response, 'Failed to create job');
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to create job');
    }
  }
);

export const updateJob = createAsyncThunk(
  'job/updateJob',
  async ({ jobId, jobData, token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(jobData),
      });
      return await handleResponse(response, 'Failed to update job');
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update job');
    }
  }
);

export const fetchJobById = createAsyncThunk(
  'job/fetchJobById',
  async ({ jobId, token }, { rejectWithValue }) => {
    try {
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, { headers });
      return await handleResponse(response, 'Failed to load job');
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to load job');
    }
  }
);

export const updateJobStatus = createAsyncThunk(
  'job/updateJobStatus',
  async ({ jobId, status, token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      return await handleResponse(response, 'Failed to update job status');
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update job status');
    }
  }
);

export const deleteJob = createAsyncThunk(
  'job/deleteJob',
  async ({ jobId, token }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      await handleResponse(response, 'Failed to delete job');
      return { id: jobId };
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to delete job');
    }
  }
);

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
  },
  extraReducers: (builder) => {
    builder
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
      // Fetch jobs
      .addCase(fetchEmployerJobs.pending, (state) => {
        state.jobsLoading = true;
        state.jobsError = null;
      })
      .addCase(fetchEmployerJobs.fulfilled, (state, action) => {
        state.jobsLoading = false;
        state.jobs = action.payload || [];
        state.jobsError = null;
      })
      .addCase(fetchEmployerJobs.rejected, (state, action) => {
        state.jobsLoading = false;
        state.jobsError = action.payload || 'Failed to fetch jobs';
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
          job._id === updatedJobId ? { ...job, status: updatedJob?.status ?? action.meta.arg.status } : job
        );
      })
      .addCase(deleteJob.fulfilled, (state, action) => {
        const deletedJobId = action.payload.id || action.meta.arg;
        state.jobs = state.jobs.filter((job) => job._id !== deletedJobId && job.id !== deletedJobId);
      });
  },
});

export const {
  setJobData,
  clearJobData,
  setValidationErrors,
  clearValidationErrors,
} = jobSlice.actions;

export default jobSlice.reducer;

