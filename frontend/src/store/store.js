import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import profileReducer from './slices/profileSlice';
import employerReducer from './slices/employerSlice';
import jobReducer from './slices/jobSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
    employer: employerReducer,
    job: jobReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for Clerk user object
        ignoredActions: ['auth/setUser'],
        // Ignore these paths in the state
        ignoredPaths: ['auth.user'],
      },
    }),
});
