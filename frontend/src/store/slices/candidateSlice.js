// frontend/src/store/slices/candidateSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';

// Async thunks
export const fetchCandidateProfile = createAsyncThunk(
  'candidate/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/candidate/profile');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateBasicInfo = createAsyncThunk(
  'candidate/updateBasicInfo',
  async (basicInfo, { rejectWithValue }) => {
    try {
      const response = await api.put('/candidate/profile', basicInfo);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const uploadResume = createAsyncThunk(
  'candidate/uploadResume',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post('/candidate/resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const addEducation = createAsyncThunk(
  'candidate/addEducation',
  async (education, { rejectWithValue }) => {
    try {
      const response = await api.post('/candidate/education', education);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const addExperience = createAsyncThunk(
  'candidate/addExperience',
  async (experience, { rejectWithValue }) => {
    try {
      const response = await api.post('/candidate/experience', experience);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updateSkills = createAsyncThunk(
  'candidate/updateSkills',
  async (skills, { rejectWithValue }) => {
    try {
      const response = await api.put('/candidate/skills', skills);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

// Delete operations
export const deleteEducation = createAsyncThunk(
  'candidate/deleteEducation',
  async (educationId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/candidate/education/${educationId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteExperience = createAsyncThunk(
  'candidate/deleteExperience',
  async (experienceId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/candidate/experience/${experienceId}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const deleteResume = createAsyncThunk(
  'candidate/deleteResume',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.delete('/candidate/resume');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const uploadProfilePhoto = createAsyncThunk(
  'candidate/uploadProfilePhoto',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post('/candidate/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const deleteProfilePhoto = createAsyncThunk(
  'candidate/deleteProfilePhoto',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.delete('/candidate/photo');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const updateNotificationPreferences = createAsyncThunk(
  'candidate/updateNotificationPreferences',
  async (preferences, { rejectWithValue }) => {
    try {
      const response = await api.put('/candidate/preferences', preferences);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const uploadVideo = createAsyncThunk(
  'candidate/uploadVideo',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await api.post('/candidate/video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const deleteVideo = createAsyncThunk(
  'candidate/deleteVideo',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.delete('/candidate/video');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialState = {
  profile: null,
  loading: false,
  error: null,
  fetchProfileRequestId: null,
};

const candidateSlice = createSlice({
  name: 'candidate',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // For immediate UI updates before API call completes
    updateProfileLocal: (state, action) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch profile
      .addCase(fetchCandidateProfile.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.fetchProfileRequestId = action.meta.requestId;
      })
      .addCase(fetchCandidateProfile.fulfilled, (state, action) => {
        if (state.fetchProfileRequestId && state.fetchProfileRequestId !== action.meta.requestId) {
          return;
        }
        state.loading = false;
        state.profile = action.payload;
        state.error = null;
        state.fetchProfileRequestId = null;
      })
      .addCase(fetchCandidateProfile.rejected, (state, action) => {
        if (state.fetchProfileRequestId && state.fetchProfileRequestId !== action.meta.requestId) {
          return;
        }
        state.loading = false;
        state.error = action.payload;
        state.fetchProfileRequestId = null;
      })
      // Update operations
      .addCase(updateBasicInfo.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      .addCase(uploadResume.fulfilled, (state, action) => {
        state.profile = action.payload.profile || action.payload;
      })
      .addCase(addEducation.fulfilled, (state, action) => {
        state.profile = action.payload.profile || action.payload;
      })
      .addCase(addExperience.fulfilled, (state, action) => {
        state.profile = action.payload.profile || action.payload;
      })
      .addCase(updateSkills.fulfilled, (state, action) => {
        state.profile = action.payload.profile || action.payload;
      })
      // Delete operations
      .addCase(deleteEducation.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      .addCase(deleteExperience.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      .addCase(deleteResume.fulfilled, (state, action) => {
        state.profile = action.payload;
      })
      // Profile photo operations
      .addCase(uploadProfilePhoto.fulfilled, (state, action) => {
        state.profile = action.payload.profile || action.payload;
      })
      .addCase(deleteProfilePhoto.fulfilled, (state, action) => {
        state.profile = action.payload.profile || action.payload;
      })
      // Video operations
      .addCase(uploadVideo.fulfilled, (state, action) => {
        state.profile = action.payload.profile || action.payload;
      })
      .addCase(deleteVideo.fulfilled, (state, action) => {
        state.profile = action.payload.profile || action.payload;
      })
      // Notification preferences
      .addCase(updateNotificationPreferences.fulfilled, (state, action) => {
        if (state.profile) {
          state.profile.notificationPreferences = action.payload.preferences;
        }
      })
      // Error handling for all async actions
      .addMatcher(
        (action) => action.type.endsWith('/rejected') && action.type !== fetchCandidateProfile.rejected.type,
        (state, action) => {
          state.error = action.payload;
        }
      );
  }
});

export const { clearError, updateProfileLocal } = candidateSlice.actions;
export default candidateSlice.reducer;
