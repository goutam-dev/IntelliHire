import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
const DEFAULT_EMPLOYER_ID = import.meta.env.VITE_DEFAULT_EMPLOYER_ID;

// Helper to get employer ID
const getEmployerId = (id) => id || DEFAULT_EMPLOYER_ID;

export const fetchEmployerProfile = createAsyncThunk(
    'employer/fetchProfile',
    async ({ token }, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/employer/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            if (!response.ok) throw new Error('Failed to fetch profile');

            return await response.json();
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const updateEmployerProfile = createAsyncThunk(
    'employer/updateProfile',
    async ({ data, token }, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/employer/profile`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) throw new Error('Failed to update profile');
            return await response.json();
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

export const uploadEmployerLogo = createAsyncThunk(
    'employer/uploadLogo',
    async ({ file, token }, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            formData.append('logo', file);

            const response = await fetch(`${API_BASE_URL}/employer/profile/logo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) throw new Error('Failed to upload logo');
            return await response.json();
        } catch (error) {
            return rejectWithValue(error.message);
        }
    }
);

const employerSlice = createSlice({
    name: 'employer',
    initialState: {
        profile: null,
        loading: false,
        error: null,
        updateSuccess: false,
    },
    reducers: {
        resetUpdateSuccess: (state) => {
            state.updateSuccess = false;
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
            .addCase(uploadEmployerLogo.fulfilled, (state, action) => {
                if (state.profile) {
                    state.profile.logoUrl = action.payload.logoUrl;
                }
            });
    },
});

export const { resetUpdateSuccess } = employerSlice.actions;
export default employerSlice.reducer;
