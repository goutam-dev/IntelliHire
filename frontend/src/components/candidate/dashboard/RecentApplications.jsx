// frontend/src/components/candidate/dashboard/RecentApplications.jsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMyApplications, clearApplicationsCache } from '../../../store/slices/jobApplicationsSlice';
import { ChevronRight, Building2, MapPin } from 'lucide-react';

const ApplicationCard = ({ application, index }) => {
  const getStatusConfig = (status) => {
    const statusLower = status?.toLowerCase();
    const dots = {
      applied: 'bg-blue-500 shadow-blue-500/40',
      pending: 'bg-amber-500 shadow-amber-500/40',
      shortlisted: 'bg-emerald-500 shadow-emerald-500/40',
      'under review': 'bg-indigo-500 shadow-indigo-500/40',
      interview: 'bg-purple-500 shadow-purple-500/40',
      'interview scheduled': 'bg-purple-500 shadow-purple-500/40',
      accepted: 'bg-green-500 shadow-green-500/40',
      hired: 'bg-green-500 shadow-green-500/40',
      rejected: 'bg-rose-500 shadow-rose-500/40',
      withdrawn: 'bg-zinc-400 shadow-zinc-400/40'
    };
    
    return {
      bg: 'bg-zinc-50',
      text: 'text-zinc-700',
      border: 'border-zinc-200',
      dot: dots[statusLower] || 'bg-zinc-400 shadow-zinc-400/40'
    };
  };

  const jobTitle = application.jobId?.title || application.jobTitle || 'Unknown Position';
  const company = application.jobId?.company || 
                  application.jobId?.employer?.companyName || 
                  application.jobId?.employer?.name || 
                  application.company || 
                  'Unknown Company';
  const location = application.jobId?.location || application.location || 'Remote / Hybrid';
  const status = application.status || 'Applied';
  
  const companyInitial = company.charAt(0).toUpperCase();
  const statusConfig = getStatusConfig(status);

  return (
    <motion.div 
      className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-zinc-200 rounded-xl hover:shadow-md hover:border-zinc-300 transition-all duration-300 cursor-pointer gap-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Left: Job Details */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Company Icon Placeholder */}
        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-lg bg-zinc-100 border border-zinc-200 shadow-sm text-zinc-900 font-bold text-lg">
          {companyInitial}
        </div>
        
        <div className="flex flex-col min-w-0">
          <h3 className="font-semibold text-zinc-900 group-hover:text-black transition-colors truncate">{jobTitle}</h3>
          <div className="flex items-center gap-1.5 mt-1 text-sm text-zinc-500 truncate">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-zinc-400" />
            <span className="truncate">{company}</span>
          </div>
        </div>
      </div>

      {/* Center: Status Badge */}
      <div className="flex-1 flex sm:justify-center">
        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-[0.7rem] uppercase tracking-[0.1em] font-bold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
          <span className={`w-2 h-2 rounded-full mr-2 shadow-sm ${statusConfig.dot}`}></span>
          {status}
        </div>
      </div>

      {/* Right: Info */}
      <div className="flex-1 flex sm:justify-end items-center gap-1.5 text-sm text-zinc-500 font-medium truncate">
        <MapPin className="w-4 h-4 text-zinc-400 flex-shrink-0" />
        <span className="truncate">{location}</span>
      </div>
    </motion.div>
  );
};

const RecentApplications = ({ showAll }) => {
  const dispatch = useDispatch();
  
  const { myApplications, loading } = useSelector(state => state.jobApplications);
  const isLoading = loading?.fetchingApplications || false;
  const [showAllApplications, setShowAllApplications] = useState(false);
  
  const shouldShowAll = showAll !== undefined ? showAll : showAllApplications;
  
  const activeApplications = myApplications.filter(app => 
    app.status?.toLowerCase() !== 'withdrawn'
  );
  
  const sortedApplications = [...activeApplications].sort((a, b) => {
    const dateA = new Date(a.appliedAt || a.createdAt || 0);
    const dateB = new Date(b.appliedAt || b.createdAt || 0);
    return dateB - dateA;
  });
  
  const applicationsToShow = shouldShowAll ? sortedApplications : sortedApplications.slice(0, 5);

  useEffect(() => {
    dispatch(clearApplicationsCache());
    dispatch(fetchMyApplications());
  }, [dispatch]);

  const handleToggleView = () => {
    setShowAllApplications(!showAllApplications);
  };

  return (
    <motion.div 
      className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/30 shadow-sm flex flex-col h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative z-10 flex items-center justify-between p-6 pb-4">
        <h2 className="text-base font-semibold text-zinc-900 tracking-tight">
          {shouldShowAll ? 'Application History' : 'Recent Activity'}
          {!isLoading && (
            <span className="ml-2 inline-flex items-center justify-center bg-zinc-200/50 text-zinc-700 text-xs font-bold rounded-full h-5 px-2 border border-zinc-200">
              {sortedApplications.length}
            </span>
          )}
        </h2>
        {sortedApplications.length > 5 && (
          <button
            onClick={handleToggleView}
            className="group flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            {shouldShowAll ? 'Collapse' : 'View All'}
            <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      <div className="px-6 pb-6 relative z-10 w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3 bg-white rounded-xl border border-zinc-200">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-zinc-300 animate-pulse" />
              <div className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse delay-100" />
              <div className="w-2 h-2 rounded-full bg-zinc-500 animate-pulse delay-200" />
            </div>
            <span className="text-sm font-medium text-zinc-500">Retrieving applications...</span>
          </div>
        ) : (
          <div className={`flex flex-col space-y-3 transition-all duration-300 ${shouldShowAll ? 'max-h-[500px] overflow-y-auto pr-2 [scrollbar-width:thin] [scrollbar-color:#d4d4d8_transparent]' : ''}`}>
            <AnimatePresence mode="popLayout">
              {applicationsToShow.map((application, index) => (
                <ApplicationCard 
                  key={application.applicationId || application._id || application.id || index} 
                  application={application} 
                  index={index} 
                />
              ))}
            </AnimatePresence>
          </div>
        )}
        
        {!isLoading && applicationsToShow.length === 0 && (
          <motion.div 
            className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-zinc-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-xl">📫</span>
            </div>
            <div className="text-sm font-semibold text-zinc-900 mb-1">No Applications Found</div>
            <div className="text-sm text-zinc-500 max-w-xs">
              When you apply for a position, it will show up here along with its current status.
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default RecentApplications;