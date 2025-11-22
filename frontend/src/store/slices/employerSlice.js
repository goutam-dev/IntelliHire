import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import employerApi from '../../services/api/employerApi';

/**
 * Employer Redux Slice - manages employer profile state
 * Uses centralized API service for all HTTP requests
 */

// ==========================================
// Async Thunks
// ==========================================

export const fetchEmployerProfile = createAsyncThunk(
  'employer/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      return await employerApi.getEmployerProfile();
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const updateEmployerProfile = createAsyncThunk(
  'employer/updateProfile',
  async (data, { rejectWithValue }) => {
    try {
      return await employerApi.updateEmployerProfile(data);
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const uploadEmployerLogo = createAsyncThunk(
  'employer/uploadLogo',
  async (file, { rejectWithValue }) => {
    try {
      return await employerApi.uploadEmployerLogo(file);
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

export const fetchDashboardStats = createAsyncThunk(
  'employer/fetchDashboardStats',
  async (_, { rejectWithValue }) => {
    try {
      return await employerApi.getDashboardStats();
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

// ==========================================
// Slice
// ==========================================

const employerSlice = createSlice({
  name: 'employer',
  initialState: {
    profile: null,
    dashboardStats: null,
    loading: false,
    error: null,
    updateSuccess: false,
  },
  reducers: {
    resetUpdateSuccess: (state) => {
      state.updateSuccess = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Profile
      .addCase(fetchEmployerProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployerProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchEmployerProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update Profile
      .addCase(updateEmployerProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.updateSuccess = false;
      })
      .addCase(updateEmployerProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.updateSuccess = true;
      })
      .addCase(updateEmployerProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Upload Logo
      .addCase(uploadEmployerLogo.pending, (state) => {
        state.loading = true;
      })
      .addCase(uploadEmployerLogo.fulfilled, (state, action) => {
        state.loading = false;
        if (state.profile) {
          state.profile.logoUrl = action.payload.logoUrl;
        }
      })
      .addCase(uploadEmployerLogo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Dashboard Stats
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.dashboardStats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetUpdateSuccess, clearError } = employerSlice.actions;
export default employerSlice.reducer;
