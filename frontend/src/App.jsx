import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { ClerkProvider } from './contexts/ClerkProvider';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';

// Pages
import LandingPage from './pages/LandingPage';
import { SignUp } from './auth/SignUp';
import { SignIn } from './auth/SignIn';
import { ForgotPassword } from './auth/ForgotPassword';
import { SSOCallback } from './auth/SSOCallback';
import { CompleteProfile } from './auth/CompleteProfile';
import { VerifyRole } from './auth/VerifyRole';
import EmployerDashboard from './pages/employer/Dashboard';
import { CandidateDashboard } from './pages/candidate/Dashboard';
import CreateJobPage from './pages/CreateJobPage';
import MyJobsPage from './pages/MyJobsPage';
import EditJobPage from './pages/EditJobPage';
import JobApplicationsPage from './pages/employer/JobApplicationsPage';
import EmployerProfilePage from './pages/employer/EmployerProfilePage';

function App() {
  return (
    <Provider store={store}>
      <ClerkProvider>
        <BrowserRouter>
        <ScrollToTop />
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
            <Route
              path="/employer/jobs"
              element={
                <ProtectedRoute allowedRoles={['employer']}>
                  <MyJobsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employer/jobs/create"
              element={
                <ProtectedRoute allowedRoles={['employer']}>
                  <CreateJobPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employer/jobs/:jobId/edit"
              element={
                <ProtectedRoute allowedRoles={['employer']}>
                  <EditJobPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employer/jobs/:jobId/applications"
              element={
                <ProtectedRoute allowedRoles={['employer']}>
                  <JobApplicationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employer/profile"
              element={
                <ProtectedRoute allowedRoles={['employer']}>
                  <EmployerProfilePage />
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
