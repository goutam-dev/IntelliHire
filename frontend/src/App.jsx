import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { ClerkProvider } from './contexts/ClerkProvider';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';

// Pages
import LandingPage from './pages/LandingPage';
import { SignUp } from './auth/SignUp';
import { SignIn } from './auth/SignIn';
import { ForgotPassword } from './auth/ForgotPassword';
import { SSOCallback } from './auth/SSOCallback';
import { CompleteProfile } from './auth/CompleteProfile';
import { VerifyRole } from './auth/VerifyRole';
import { EmployerDashboard } from './pages/employer/Dashboard';
import { CandidateDashboard } from './pages/candidate/Dashboard';

function App() {
  return (
    <Provider store={store}>
      <ClerkProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/"
              element={
                <PublicOnlyRoute>
                  <LandingPage />
                </PublicOnlyRoute>
              }
            />
            
            {/* Auth Routes - Redirect if already signed in */}
            <Route
              path="/sign-up"
              element={
                <PublicOnlyRoute>
                  <SignUp />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/sign-in"
              element={
                <PublicOnlyRoute>
                  <SignIn />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicOnlyRoute>
                  <ForgotPassword />
                </PublicOnlyRoute>
              }
            />

            {/* OAuth Callback Routes */}
            <Route path="/sso-callback" element={<SSOCallback />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/sign-in/verify-role" element={<VerifyRole />} />

            {/* Employer Routes */}
            <Route
              path="/employer/dashboard"
              element={
                <ProtectedRoute allowedRoles={['employer']}>
                  <EmployerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Candidate Routes */}
            <Route
              path="/candidate/dashboard"
              element={
                <ProtectedRoute allowedRoles={['candidate']}>
                  <CandidateDashboard />
                </ProtectedRoute>
              }
            />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ClerkProvider>
    </Provider>
  );
}

export default App;
