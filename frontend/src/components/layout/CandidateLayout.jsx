import React, { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import CandidateHeader from "../candidate/CandidateHeader";
import { fetchCandidateProfile } from "../../store/slices/candidateSlice";
import SkeletonLoader from "../common/SkeletonLoader";

const getSkeletonType = (path) => {
  if (
    path.includes('/profile') ||
    path.match(/\/jobs\/[\w-]+$/) ||
    path.match(/\/applications\/[\w-]+$/)
  ) {
    return 'layout-profile';
  }

  if (path.includes('/jobs') && !path.includes('/dashboard')) {
    return 'layout-list';
  }

  if (path.includes('/applications') && !path.includes('/dashboard')) {
    return 'layout-list';
  }

  if (path.includes('/apply') || path.includes('/interview')) {
    return 'layout-form';
  }

  return 'dashboard-layout';
};

const CandidateLayout = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { profile, loading, error } = useSelector((state) => state.candidate);
  const [hasStartedInitialFetch, setHasStartedInitialFetch] = useState(false);
  const [showErrorFallback, setShowErrorFallback] = useState(false);
  const skeletonType = getSkeletonType(location.pathname);

  useEffect(() => {
    setHasStartedInitialFetch(true);
    dispatch(fetchCandidateProfile());
  }, [dispatch]);

  useEffect(() => {
    let timer;

    if (error && !profile && !loading) {
      timer = setTimeout(() => {
        setShowErrorFallback(true);
      }, 900);
    } else {
      setShowErrorFallback(false);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [error, profile, loading]);

  // Prevent transient fallback UI before the initial fetch starts.
  if (!hasStartedInitialFetch && !profile) {
    return <SkeletonLoader type={skeletonType} />;
  }

  // Show loading state for initial profile load
  if (loading && !profile) {
    return <SkeletonLoader type={skeletonType} />;
  }

  // Guard against transient reload errors to avoid flashing fallback UI.
  if (error && !profile && !showErrorFallback) {
    return <SkeletonLoader type={skeletonType} />;
  }

  // Show error state
  if (error && !profile && showErrorFallback) {
    const errorMessage =
      typeof error === "string" ? error : error?.message || "Unknown error";

    return (
      <div className="min-h-screen bg-slate-50">
        <CandidateHeader />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center max-w-md">
            <div className="text-red-500 text-lg mb-4">
              ⚠️ Failed to load profile
            </div>
            <p className="text-slate-600 mb-4 bg-red-50 p-4 rounded-lg">
              {errorMessage}
            </p>
            <button
              onClick={() => dispatch(fetchCandidateProfile())}
              className="bg-slate-900 text-white px-6 py-2 rounded-full hover:bg-slate-800"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Safety check
  if (!profile && !loading && !error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <CandidateHeader />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="text-orange-500 text-lg mb-4">
              No profile data available
            </div>
            <button
              onClick={() => dispatch(fetchCandidateProfile())}
              className="bg-slate-900 text-white px-6 py-2 rounded-full hover:bg-slate-800"
            >
              Load Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <CandidateHeader />
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default CandidateLayout;
