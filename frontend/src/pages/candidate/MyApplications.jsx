import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  MapPin,
  Clock,
  Calendar,
  Eye,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  Search,
  FileText,
  ExternalLink,
  Video,
  CalendarClock
} from 'lucide-react';

import {
  fetchMyApplications,
  withdrawApplication,
  clearError,
  clearSuccessMessage
} from '../../store/slices/jobApplicationsSlice';

const MyApplications = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    myApplications,
    applicationsPagination,
    loading,
    error,
    successMessage
  } = useSelector((state) => state.jobApplications);

  // Local state
  const [filters, setFilters] = useState({
    status: 'all',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedApplication, setHighlightedApplication] = useState(null);

  // Status options for filter
  const statusOptions = [
    { value: 'all', label: 'All Applications', count: 0 },
    { value: 'Applied', label: 'Applied', count: 0 },
    { value: 'Under Review', label: 'Under Review', count: 0 },
    { value: 'Shortlisted', label: 'Shortlisted', count: 0 },
    { value: 'Interview Scheduled', label: 'Interview Scheduled', count: 0 },
    { value: 'Rejected', label: 'Rejected', count: 0 },
    { value: 'Hired', label: 'Hired', count: 0 },
    { value: 'Withdrawn', label: 'Withdrawn', count: 0 }
  ];

  // Load applications on component mount
  useEffect(() => {
    const params = {
      page: currentPage,
      limit: 10,
      status: filters.status
    };
    dispatch(fetchMyApplications(params));
  }, [dispatch, currentPage, filters.status]);

  // Handle highlighting from navigation state
  useEffect(() => {
    if (location.state?.highlightApplication) {
      setHighlightedApplication(location.state.highlightApplication);
      // Clear highlight after 3 seconds
      setTimeout(() => {
        setHighlightedApplication(null);
      }, 3000);
    }
  }, [location.state]);

  // Clear messages after some time
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        dispatch(clearSuccessMessage());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, dispatch]);

  const handleStatusFilter = (status) => {
    setFilters(prev => ({ ...prev, status }));
    setCurrentPage(1);
  };

  const handleWithdrawApplication = async (applicationId) => {
    if (window.confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) {
      try {
        await dispatch(withdrawApplication(applicationId)).unwrap();
      } catch (error) {
        console.error('Failed to withdraw application:', error);
      }
    }
  };

  /**
   * Returns true if today is on or before the interview deadline.
   */
  const isInterviewWindowActive = (app) => {
    if (!app.interviewWindowEnd) return false;
    const now = new Date();
    const deadline = new Date(app.interviewWindowEnd);
    // Set deadline to end-of-day
    deadline.setHours(23, 59, 59, 999);
    return now <= deadline;
  };

  const formatInterviewDeadline = (app) => {
    if (!app.interviewWindowEnd) return null;
    return new Date(app.interviewWindowEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status) => {
    const colors = {
      'Applied': 'bg-blue-100 text-blue-800 border-blue-200',
      'Under Review': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Shortlisted': 'bg-purple-100 text-purple-800 border-purple-200',
      'Interview Scheduled': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Rejected': 'bg-red-100 text-red-800 border-red-200',
      'Hired': 'bg-green-100 text-green-800 border-green-200',
      'Withdrawn': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'Applied': <Clock className="w-4 h-4" />,
      'Under Review': <Eye className="w-4 h-4" />,
      'Shortlisted': <CheckCircle className="w-4 h-4" />,
      'Interview Scheduled': <Calendar className="w-4 h-4" />,
      'Rejected': <XCircle className="w-4 h-4" />,
      'Hired': <CheckCircle className="w-4 h-4" />,
      'Withdrawn': <XCircle className="w-4 h-4" />
    };
    return icons[status] || <Clock className="w-4 h-4" />;
  };

  if (loading.fetchingApplications) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your applications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
              <p className="text-slate-600 mt-1">
                Track and manage your job applications
              </p>
            </div>
            <button
              onClick={() => navigate('/candidate/jobs')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Browse Jobs
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Success/Error Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
            <button
              onClick={() => dispatch(clearError())}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Filter Applications</h2>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusFilter(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filters.status === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {option.label}
                {option.value === 'all' && applicationsPagination.totalApplications > 0 && (
                  <span className="ml-2 text-xs">({applicationsPagination.totalApplications})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Applications List */}
        {myApplications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No Applications Found
            </h3>
            <p className="text-slate-600 mb-6">
              {filters.status === 'all' 
                ? "You haven't applied to any jobs yet."
                : `No applications with status "${filters.status}" found.`
              }
            </p>
            <button
              onClick={() => navigate('/candidate/jobs')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {myApplications.map((application) => (
                <motion.div
                  key={application.applicationId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`bg-white rounded-lg shadow-sm border transition-all duration-300 ${
                    highlightedApplication === application.applicationId
                      ? 'border-blue-300 shadow-md ring-2 ring-blue-100'
                      : 'border-slate-200 hover:shadow-md'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {application.jobId?.title || 'Job Title Not Available'}
                          </h3>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(application.status)}`}>
                            {getStatusIcon(application.status)}
                            {application.status}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            <span>{application.jobId?.company || 'Company'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{application.jobId?.location || 'Location'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Applied {application.appliedAgo}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>Application ID: {application.applicationId}</span>
                          {application.jobId?.salaryRange && (
                            <>
                              <span>•</span>
                              <span>
                                ${application.jobId.salaryRange.min?.toLocaleString()} - 
                                ${application.jobId.salaryRange.max?.toLocaleString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => navigate(`/candidate/applications/${application.applicationId}`)}
                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </button>
                        
                        {application.jobId?._id && (
                          <button
                            onClick={() => navigate(`/jobs/${application.jobId._id}`)}
                            className="text-sm text-slate-600 hover:text-slate-700 flex items-center gap-1"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View Job
                          </button>
                        )}
                      </div>

                      {application.status === 'Applied' && (
                        <button
                          onClick={() => handleWithdrawApplication(application.applicationId)}
                          disabled={loading.withdrawing}
                          className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50 flex items-center gap-1"
                        >
                          {loading.withdrawing ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Withdraw
                        </button>
                      )}

                      {application.status === 'Interview Scheduled' && (() => {
                        const active = isInterviewWindowActive(application);
                        const deadline = formatInterviewDeadline(application);
                        return (
                          <div className="flex flex-col items-end gap-1">
                            {deadline && (
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <CalendarClock className="w-3.5 h-3.5" />
                                Interview deadline: {deadline}
                              </span>
                            )}
                            <button
                              disabled={!active}
                              onClick={() =>
                                navigate(`/candidate/interview/${application.applicationId}`, {
                                  state: {
                                    jobTitle: application.jobId?.title,
                                    jobId: application.jobId?._id,
                                    applicationId: application.applicationId,
                                  },
                                })
                              }
                              title={active ? 'Give your interview now' : deadline ? `Deadline was ${deadline}` : 'Interview deadline not set'}
                              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                active
                                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              }`}
                            >
                              <Video className="w-4 h-4" />
                              {active ? 'Give Interview' : 'Interview Deadline Passed'}
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {applicationsPagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-8">
            <div className="text-sm text-slate-600">
              Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, applicationsPagination.totalApplications)} of {applicationsPagination.totalApplications} applications
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={!applicationsPagination.hasPrevPage}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Previous
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: applicationsPagination.totalPages }, (_, i) => i + 1)
                  .filter(page => 
                    page === 1 || 
                    page === applicationsPagination.totalPages || 
                    Math.abs(page - currentPage) <= 1
                  )
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="px-2 text-slate-400">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg text-sm ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(applicationsPagination.totalPages, prev + 1))}
                disabled={!applicationsPagination.hasNextPage}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyApplications;