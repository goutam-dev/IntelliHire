import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null, // Clerk user object
  role: null, // 'employer' or 'candidate'
  isLoaded: false,
  isSignedIn: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload.user;
      state.role = action.payload.role;
      state.isSignedIn = !!action.payload.user;
      state.isLoaded = true;
    },
    clearUser: (state) => {
      state.user = null;
      state.role = null;
      state.isSignedIn = false;
      state.isLoaded = true;
    },
    setLoaded: (state, action) => {
      state.isLoaded = action.payload;
    },
  },
});

export const { setUser, clearUser, setLoaded } = authSlice.actions;
export default authSlice.reducer;
