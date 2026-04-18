import { useAuth, useUser } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import SkeletonLoader from './common/SkeletonLoader';

export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { role } = useSelector((state) => state.auth);
  const location = useLocation();

  // Show loading state while Clerk is loading OR while user data is loading
  if (!isLoaded || (isSignedIn && !user)) {
    // Determine skeleton type based on path
    const path = location.pathname;
    let skeletonType = 'dashboard-layout';
    
    if (path.includes('/profile')) {
      skeletonType = 'layout-profile';
    } else if (path.includes('/jobs') && !path.includes('/dashboard')) {
      skeletonType = 'layout-list';
    } else if (path.includes('/applications') && !path.includes('/dashboard')) {
      skeletonType = 'layout-list';
    } else if (path.includes('/apply') || path.includes('/create') || path.includes('/edit') || path.includes('/interview')) {
      skeletonType = 'layout-form';
    }

    return <SkeletonLoader type={skeletonType} />;
  }

  // Redirect to sign-in if not authenticated
  if (!isSignedIn) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  // Wait for role to be loaded from user metadata
  const userRole = role || user?.publicMetadata?.role;
  
  // Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = userRole === 'employer' ? '/employer/dashboard' : '/candidate/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

// Redirect authenticated users away from auth pages
export function PublicOnlyRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { role } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!isLoaded) {
    const path = location.pathname;
    if (path === '/') {
      return <SkeletonLoader type="layout-landing" />;
    } else if (path.includes('/sign')) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <SkeletonLoader type="layout-form" />
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (isSignedIn) {
    if (!role) {
      return <Navigate to="/complete-profile" replace />;
    }
    const redirectPath = role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}
