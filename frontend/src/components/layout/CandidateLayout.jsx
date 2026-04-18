import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import CandidateHeader from "../candidate/CandidateHeader";
import { fetchCandidateProfile } from "../../store/slices/candidateSlice";
import SkeletonLoader from "../common/SkeletonLoader";

const CandidateLayout = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { profile, loading, error } = useSelector((state) => state.candidate);

  useEffect(() => {
    dispatch(fetchCandidateProfile());
  }, [dispatch]);

  // Show loading state for initial profile load
  if (loading && !profile) {
    let skeletonType = 'dashboard-layout';
    const path = location.pathname;
    
    if (path.includes('/profile') || path.match(/\/jobs\/[\w-]+$/) || path.match(/\/applications\/[\w-]+$/)) {
      skeletonType = 'layout-profile';
    } else if (path.includes('/jobs') && !path.includes('/dashboard')) {
      skeletonType = 'layout-list';
    } else if (path.includes('/applications') && !path.includes('/dashboard')) {
      skeletonType = 'layout-list';
    } else if (path.includes('/apply') || path.includes('/interview')) {
      skeletonType = 'layout-form';
    }

    return <SkeletonLoader type={skeletonType} />;
  }

  // Show error state
  if (error && !profile) {
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
  if (!profile && !loading) {
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
