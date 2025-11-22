// frontend/src/components/candidate/dashboard/ApplicationStats.jsx
import React, { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { fetchMyApplications, clearApplicationsCache } from "../../../store/slices/jobApplicationsSlice";

const StatCard = ({ number, label, color, delay }) => (
  <motion.div
    className={`text-center p-3 rounded-xl border ${color} backdrop-blur-sm`}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, duration: 0.5 }}
    whileHover={{
      scale: 1.05,
      y: -2,
      transition: { duration: 0.2 },
    }}
  >
    <motion.div
      className="text-xl font-bold"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: delay + 0.2, type: "spring", stiffness: 200 }}
    >
      {number}
    </motion.div>
    <div className="text-xs mt-1">{label}</div>
  </motion.div>
);

const ApplicationStats = ({ stats }) => {
  const dispatch = useDispatch();
  const { myApplications, loading } = useSelector((state) => state.jobApplications);
  const isLoading = loading?.fetchingApplications || false;

  // Fetch applications when component mounts - always fetch fresh data
  useEffect(() => {
    dispatch(clearApplicationsCache());
    dispatch(fetchMyApplications());
  }, [dispatch]);

  // Calculate real statistics from applications data (excluding withdrawn)
  const calculatedStats = useMemo(() => {
    if (!myApplications || myApplications.length === 0) {
      return {
        totalApplications: 0,
        pending: 0,
        shortlisted: 0,
        rejected: 0
      };
    }

    // Filter out withdrawn applications
    const activeApplications = myApplications.filter(app => 
      app.status?.toLowerCase() !== 'withdrawn'
    );

    const statusCounts = activeApplications.reduce((acc, app) => {
      const status = app.status?.toLowerCase() || 'pending';
      
      // Map various statuses to our display categories
      if (status === 'applied' || status === 'pending' || status === 'under review') {
        acc.pending++;
      } else if (status === 'shortlisted' || status === 'interview' || status === 'accepted' || status === 'hired') {
        acc.shortlisted++;
      } else if (status === 'rejected') {
        acc.rejected++;
      }
      // Note: withdrawn applications are already filtered out, so no else case needed
      
      return acc;
    }, { pending: 0, shortlisted: 0, rejected: 0 });

    return {
      totalApplications: activeApplications.length,
      ...statusCounts
    };
  }, [myApplications]);

  // Use provided stats or calculated stats
  const displayStats = stats || calculatedStats;

  return (
    <motion.div
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      whileHover={{ y: -2 }}
    >
      <h3 className="text-base font-semibold text-slate-900 mb-3">
        Application Statistics
        {isLoading && (
          <div className="inline-block ml-2">
            <div className="animate-spin rounded-full h-3 w-3 border border-slate-300 border-t-slate-600"></div>
          </div>
        )}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          number={displayStats.totalApplications || 0}
          label="Total Applications"
          color="bg-blue-50 border-blue-200 text-blue-900"
          delay={0.1}
        />
        <StatCard
          number={displayStats.pending || 0}
          label="Pending"
          color="bg-orange-50 border-orange-200 text-orange-900"
          delay={0.2}
        />
        <StatCard
          number={displayStats.shortlisted || 0}
          label="Shortlisted"
          color="bg-green-50 border-green-200 text-green-900"
          delay={0.3}
        />
        <StatCard
          number={displayStats.rejected || 0}
          label="Rejected"
          color="bg-red-50 border-red-200 text-red-900"
          delay={0.4}
        />
      </div>
    </motion.div>
  );
};

export default ApplicationStats;
