import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { ClerkProvider } from './contexts/ClerkProvider';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/common/ErrorBoundary';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages
import LandingPage from './pages/LandingPage';
import { SignUp } from './auth/SignUp';
import { SignIn } from './auth/SignIn';
import { ForgotPassword } from './auth/ForgotPassword';
import { SSOCallback } from './auth/SSOCallback';
import { CompleteProfile } from './auth/CompleteProfile';
import { VerifyRole } from './auth/VerifyRole';
import EmployerDashboard from './pages/employer/Dashboard';
import CandidateDashboard from './pages/candidate/Dashboard';
import BrowseJobs from './pages/candidate/BrowseJobs';
import MyApplications from './pages/candidate/MyApplications';
import Profile from './pages/candidate/Profile';
import JobApplication from './pages/candidate/JobApplication';
import ApplicationDetails from './pages/candidate/ApplicationDetails';
import JobDetails from './pages/candidate/JobDetails';
import CandidateLayout from './components/layout/CandidateLayout';
import CreateJobPage from './pages/CreateJobPage';
import MyJobsPage from './pages/MyJobsPage';
import EditJobPage from './pages/EditJobPage';
import JobApplicationsPage from './pages/employer/JobApplicationsPage';
import EmployerProfilePage from './pages/employer/EmployerProfilePage';

function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ClerkProvider>
          <BrowserRouter>
          <ScrollToTop />
          <ToastContainer position="top-right" autoClose={3000} />
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
              path="/candidate"
              element={
                <ProtectedRoute allowedRoles={['candidate']}>
                  <CandidateLayout />
                </ProtectedRoute>
              }
            >
              <Route path="dashboard" element={<CandidateDashboard />} />
              <Route path="jobs" element={<BrowseJobs />} />
              <Route path="jobs/:jobId" element={<JobDetails />} />
              <Route path="applications" element={<MyApplications />} />
              <Route path="applications/:applicationId" element={<ApplicationDetails />} />
              <Route path="profile" element={<Profile />} />
              <Route path="apply/:jobId" element={<JobApplication />} />
              
              {/* Redirect /candidate to /candidate/dashboard */}
              <Route index element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </BrowserRouter>
        </ClerkProvider>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
