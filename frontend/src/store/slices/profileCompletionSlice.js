import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../lib/api';
import { 
  updateBasicInfo, 
  uploadResume, 
  addEducation, 
  addExperience, 
  updateSkills,
  deleteEducation,
  deleteExperience,
  deleteResume
} from './candidateSlice';

// Async thunk for fetching profile completion
export const fetchProfileCompletion = createAsyncThunk(
  'profileCompletion/fetchCompletion',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/candidate/completion');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile completion');
    }
  }
);

const profileCompletionSlice = createSlice({
  name: 'profileCompletion',
  initialState: {
    completion: {
      basicInfo: true,
      resume: false,
      education: false,
      experience: false,
      skills: false,
      percentage: 20
    },
    incompleteSections: [],
    isComplete: false,
    loading: false,
    error: null
  },
  reducers: {
    updateCompletion: (state, action) => {
      state.completion = action.payload.completion;
      state.incompleteSections = action.payload.incompleteSections;
      state.isComplete = action.payload.isComplete;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfileCompletion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfileCompletion.fulfilled, (state, action) => {
        state.loading = false;
        state.completion = action.payload.completion;
        state.incompleteSections = action.payload.incompleteSections;
        state.isComplete = action.payload.isComplete;
      })
      .addCase(fetchProfileCompletion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Auto-refresh completion when profile changes
      .addCase(updateBasicInfo.fulfilled, (state) => {
        // Will be refreshed by component useEffect
      })
      .addCase(uploadResume.fulfilled, (state) => {
        // Will be refreshed by component useEffect
      })
      .addCase(addEducation.fulfilled, (state) => {
        // Will be refreshed by component useEffect
      })
      .addCase(addExperience.fulfilled, (state) => {
        // Will be refreshed by component useEffect
      })
      .addCase(updateSkills.fulfilled, (state) => {
        // Will be refreshed by component useEffect
      })
      .addCase(deleteEducation.fulfilled, (state) => {
        // Will be refreshed by component useEffect
      })
      .addCase(deleteExperience.fulfilled, (state) => {
        // Will be refreshed by component useEffect
      })
      .addCase(deleteResume.fulfilled, (state) => {
        // Will be refreshed by component useEffect
      });
  }
});

export const { updateCompletion, clearError } = profileCompletionSlice.actions;
export default profileCompletionSlice.reducer;
