import { useAuth } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { role } = useSelector((state) => state.auth);
  const location = useLocation();

  // Show loading state while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

// Redirect authenticated users away from auth pages
export function PublicOnlyRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { role } = useSelector((state) => state.auth);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (isSignedIn) {
    const redirectPath = role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}
