// frontend/src/components/candidate/dashboard/RecentApplications.jsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMyApplications, clearApplicationsCache } from '../../../store/slices/jobApplicationsSlice';

const ApplicationRow = ({ application, index }) => {
  const getStatusColor = (status) => {
    const statusLower = status?.toLowerCase();
    const colors = {
      applied: 'bg-blue-100 text-blue-800 border-blue-200',
      pending: 'bg-blue-100 text-blue-800 border-blue-200',
      shortlisted: 'bg-orange-100 text-orange-800 border-orange-200',
      'under review': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      interview: 'bg-purple-100 text-purple-800 border-purple-200',
      accepted: 'bg-green-100 text-green-800 border-green-200',
      hired: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      withdrawn: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[statusLower] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

  // Extract job title and company from the real application data structure
  const jobTitle = application.jobId?.title || application.jobTitle || 'Unknown Position';
  const company = application.jobId?.company || 
                  application.jobId?.employer?.companyName || 
                  application.jobId?.employer?.name || 
                  application.company || 
                  'Unknown Company';
  const appliedDate = application.appliedAt || application.createdAt || application.appliedDate;
  const status = application.status || 'Applied';

  return (
    <motion.tr 
      className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ 
        backgroundColor: "rgba(248, 250, 252, 1)",
        transition: { duration: 0.2 }
      }}
    >
      <td className="py-2 px-3">
        <div className="font-medium text-slate-900 text-sm">{jobTitle}</div>
      </td>
      <td className="py-2 px-3 text-slate-600 text-sm">{company}</td>
      <td className="py-2 px-3 text-slate-600 text-xs">
        {appliedDate ? new Date(appliedDate).toLocaleDateString() : 'N/A'}
      </td>
      <td className="py-2 px-3">
        <motion.span 
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}
          whileHover={{ scale: 1.05 }}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </motion.span>
      </td>
    </motion.tr>
  );
};

const RecentApplications = ({ showAll }) => {
  const dispatch = useDispatch();
  
  // Get real applications data from jobApplicationsSlice
  const { myApplications, loading } = useSelector(state => state.jobApplications);
  const isLoading = loading?.fetchingApplications || false;
  const [showAllApplications, setShowAllApplications] = useState(false);
  
  // Use showAll prop or local state
  const shouldShowAll = showAll !== undefined ? showAll : showAllApplications;
  
  // Filter out withdrawn applications and sort by applied date (most recent first)
  const activeApplications = myApplications.filter(app => 
    app.status?.toLowerCase() !== 'withdrawn'
  );
  
  const sortedApplications = [...activeApplications].sort((a, b) => {
    const dateA = new Date(a.appliedAt || a.createdAt || 0);
    const dateB = new Date(b.appliedAt || b.createdAt || 0);
    return dateB - dateA;
  });
  
  const applicationsToShow = shouldShowAll ? sortedApplications : sortedApplications.slice(0, 5);

  // Fetch applications when component mounts - always fetch fresh data
  useEffect(() => {
    dispatch(clearApplicationsCache());
    dispatch(fetchMyApplications());
  }, [dispatch]);

  const handleToggleView = () => {
    setShowAllApplications(!showAllApplications);
  };

  return (
    <motion.div 
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      whileHover={{ y: -2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          {shouldShowAll ? 'All Applications' : 'Recent Applications'}
          {!isLoading && (
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({sortedApplications.length})
            </span>
          )}
        </h2>
        {sortedApplications.length > 5 && (
          <motion.button
            onClick={handleToggleView}
            className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-slate-400 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {shouldShowAll ? 'Show Less' : 'View All'}
          </motion.button>
        )}
      </div>

      <div className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-slate-600"></div>
            <span className="ml-2 text-sm text-slate-600">Loading applications...</span>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-slate-600">Job Title</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-slate-600">Company</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-slate-600">Applied</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="wait">
                {applicationsToShow.map((application, index) => (
                  <ApplicationRow 
                    key={application.applicationId || application._id || application.id || index} 
                    application={application} 
                    index={index} 
                  />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
        
        {!isLoading && applicationsToShow.length === 0 && (
          <motion.div 
            className="text-center py-8 text-slate-500 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="mb-2">📄</div>
            <div className="font-medium mb-1">No applications yet</div>
            <div>Start applying to jobs to see them here!</div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default RecentApplications;