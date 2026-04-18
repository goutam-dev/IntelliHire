import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  MapPin,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  Search,
  FileText,
  ExternalLink,
  Video,
  RotateCcw
} from 'lucide-react';

import {
  fetchMyApplications,
  withdrawApplication,
  clearError,
  clearSuccessMessage
} from '../../store/slices/jobApplicationsSlice';
import InterviewSlotCard from '../../components/candidate/InterviewSlotCard';
import ReInterviewRequestDialog, { ReInterviewStatusBadge } from '../../components/candidate/ReInterviewRequestDialog';
import { requestReInterview } from '../../services/api/applicationApi';
import SkeletonLoader from '../../components/common/SkeletonLoader';

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
  const [withdrawingAppId, setWithdrawingAppId] = useState(null);
  const [reInterviewDialogApp, setReInterviewDialogApp] = useState(null);
  const [reInterviewLoading, setReInterviewLoading] = useState(false);

  // Status options for filter - simplified to only important ones
  const statusOptions = [
    { value: 'all', label: 'All Applications', count: 0 },
    { value: 'Applied', label: 'Applied', count: 0 },
    { value: 'Shortlisted', label: 'Shortlisted', count: 0 },
    { value: 'Interview Scheduled', label: 'Interview Scheduled', count: 0 },
    { value: 'Hired', label: 'Hired', count: 0 },
    { value: 'Rejected', label: 'Rejected', count: 0 }
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
    try {
      await dispatch(withdrawApplication(applicationId)).unwrap();
      setWithdrawingAppId(null);
    } catch (error) {
      console.error('Failed to withdraw application:', error);
    }
  };

  const handleRequestReInterview = async (reason) => {
    if (!reInterviewDialogApp) return;
    setReInterviewLoading(true);
    try {
      await requestReInterview(reInterviewDialogApp.applicationId, { reason });
      setReInterviewDialogApp(null);
      // Refresh to show updated status
      dispatch(fetchMyApplications({ page: currentPage, limit: 10, status: filters.status }));
    } catch (error) {
      console.error('Failed to request re-interview:', error);
      alert(error?.response?.data?.message || 'Failed to submit re-interview request.');
    } finally {
      setReInterviewLoading(false);
    }
  };

  /**
   * Returns true only when current time is within interview start/end window.
   */
  const isInterviewWindowActive = (app) => {
    if (!app.interviewWindowStart || !app.interviewWindowEnd) return false;
    const now = new Date();
    const start = new Date(app.interviewWindowStart);
    const deadline = new Date(app.interviewWindowEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(deadline.getTime())) return false;
    return now >= start && now <= deadline;
  };

  const formatInterviewWindow = (app) => {
    if (!app.interviewWindowStart || !app.interviewWindowEnd) return null;
    const start = new Date(app.interviewWindowStart);
    const end = new Date(app.interviewWindowEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const formatDateTime = (value) => value.toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      start: formatDateTime(start),
      end: formatDateTime(end),
    };
  };

  const getStatusColor = (status) => {
    const colors = {
      'Applied': 'bg-slate-100 text-slate-700 border-slate-200/80',
      'Shortlisted': 'bg-sky-50 text-sky-700 border-sky-200/80',
      'Interview Scheduled': 'bg-cyan-50 text-cyan-700 border-cyan-200/80',
      'Job Deleted': 'bg-zinc-200 text-zinc-700 border-zinc-300',
      'Rejected': 'bg-rose-50 text-rose-700 border-rose-200/80',
      'Hired': 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      'Withdrawn': 'bg-zinc-100 text-zinc-600 border-zinc-200/80'
    };
    return colors[status] || 'bg-zinc-100 text-zinc-700 border-zinc-200/80';
  };

  const getStatusIcon = (status) => {
    const icons = {
      'Applied': <Clock className="w-4 h-4" />,
      'Shortlisted': <CheckCircle className="w-4 h-4" />,
      'Interview Scheduled': <Calendar className="w-4 h-4" />,
      'Job Deleted': <AlertCircle className="w-4 h-4" />,
      'Rejected': <XCircle className="w-4 h-4" />,
      'Hired': <CheckCircle className="w-4 h-4" />,
      'Withdrawn': <XCircle className="w-4 h-4" />
    };
    return icons[status] || <Clock className="w-4 h-4" />;
  };

  if (loading.fetchingApplications) {
    return <SkeletonLoader type="layout-list" />;
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">My Applications</h1>
              <p className="text-zinc-500 mt-1.5 text-sm sm:text-base font-medium">
                Track and manage your job applications
              </p>
            </div>
            <button
              onClick={() => navigate('/candidate/jobs')}
              className="px-5 py-2.5 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900"
            >
              <Search className="w-4 h-4 text-zinc-400" />
              Browse Jobs
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Success/Error Messages */}
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-rose-50/80 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="text-sm font-medium">{error}</span>
            <button
              onClick={() => dispatch(clearError())}
              className="ml-auto text-rose-500 hover:text-rose-700 hover:bg-rose-100 p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {successMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 shadow-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <span className="text-sm font-medium">{successMessage}</span>
          </motion.div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 mb-8">
          <div className="flex items-center gap-2.5 mb-5">
            <Filter className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-bold text-zinc-900 tracking-wide uppercase">Filter Applications</h2>
          </div>
          
          <div className="flex flex-wrap gap-2.5">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleStatusFilter(option.value)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                  filters.status === option.value
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900'
                }`}
              >
                {option.label}
                {option.value === 'all' && applicationsPagination.totalApplications > 0 && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${filters.status === option.value ? 'bg-zinc-800/80 text-zinc-300' : 'bg-zinc-100 text-zinc-500'}`}>
                    {applicationsPagination.totalApplications}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Applications List */}
        {myApplications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-12 sm:p-16 text-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-2">
              No Applications Found
            </h3>
            <p className="text-zinc-500 mb-8 max-w-md mx-auto text-sm">
              {filters.status === 'all' 
                ? "Your journey starts here. Explore opportunities and submit your first application to get started."
                : `We couldn't find any applications matching the status "${filters.status}". Try adjusting your filters.`
              }
            </p>
            <button
              onClick={() => navigate('/candidate/jobs')}
              className="px-6 py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 inline-flex items-center gap-2"
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <AnimatePresence>
              {myApplications.map((application) => (
                <motion.div
                  key={application.applicationId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 group overflow-hidden ${
                    highlightedApplication === application.applicationId
                      ? 'border-zinc-900 shadow-lg ring-1 ring-zinc-900'
                      : 'border-zinc-200 hover:shadow-xl hover:-translate-y-0.5 hover:border-zinc-300'
                  }`}
                >
                  {(() => {
                    const isJobClosed = application.jobId?.status === 'closed';
                    const closedAt = application.jobId?.closedAt ? new Date(application.jobId.closedAt) : null;
                    const closedAtLabel = closedAt && !Number.isNaN(closedAt.getTime())
                      ? closedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                      : null;

                    return (
                  <div className="p-6 sm:p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex-1 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                          <h3 className="text-xl font-bold text-zinc-900 tracking-tight group-hover:text-zinc-700 transition-colors">
                            {application.jobId?.title || 'Job Title Not Available'}
                          </h3>
                          <div className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider border flex items-center self-start sm:self-auto gap-1.5 shadow-sm ${getStatusColor(application.status)}`}>
                            {getStatusIcon(application.status)}
                            {application.status}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-zinc-600 mb-4">
                          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200/60 px-2.5 py-1 rounded-md">
                            <Building2 className="w-4 h-4 text-zinc-400" />
                            <span>{application.jobId?.company || 'Company'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200/60 px-2.5 py-1 rounded-md">
                            <MapPin className="w-4 h-4 text-zinc-400" />
                            <span>{application.jobId?.location || 'Location'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200/60 px-2.5 py-1 rounded-md">
                            <Calendar className="w-4 h-4 text-zinc-400" />
                            <span>Applied {application.appliedAgo}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs font-bold text-zinc-400 uppercase">
                          {application.jobId?.salaryRange && (
                            <span className="text-emerald-600 tracking-widest">
                              Salary: ${application.jobId.salaryRange.min?.toLocaleString()} - ${application.jobId.salaryRange.max?.toLocaleString()}
                            </span>
                          )}
                        </div>

                        {isJobClosed && (
                          <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800">
                            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                            <p className="text-sm font-medium">
                              This role has been closed by the employer{closedAtLabel ? ` on ${closedAtLabel}` : ''}. New applications are stopped.
                            </p>
                          </div>
                        )}

                        {application.status === 'Job Deleted' && (
                          <div className="mt-4 p-3 bg-zinc-100 border border-zinc-300 rounded-xl flex items-start gap-2.5 text-zinc-700">
                            <FileText className="w-4 h-4 text-zinc-500 mt-0.5" />
                            <p className="text-sm font-medium">This role was removed by the employer. This application is retained for your records only.</p>
                          </div>
                        )}

                        {application.status === 'Interview Scheduled' && isJobClosed && (
                          <div className="mt-4 p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-start gap-2.5 text-indigo-800">
                            <Calendar className="w-4 h-4 text-indigo-600 mt-0.5" />
                            <p className="text-sm font-medium">The job is closed for new applicants, but your scheduled interview remains valid.</p>
                          </div>
                        )}

                        {/* Re-interview request status badge */}
                        {application.status === 'Interviewed' && application.reInterviewRequest && application.reInterviewRequest.status !== 'none' && (
                          <div className="mt-3">
                            <ReInterviewStatusBadge reInterviewRequest={application.reInterviewRequest} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 pt-5 border-t border-zinc-100 sm:flex-row sm:items-center justify-between">
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => navigate(`/candidate/applications/${application.applicationId}`)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-zinc-900 border border-zinc-900 text-white rounded-xl text-sm font-bold shadow-sm hover:bg-zinc-800 hover:shadow-md transition-all flex items-center justify-center gap-1.5 focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900"
                        >
                          <FileText className="w-4 h-4 text-zinc-400" />
                          View Details
                        </button>
                        
                        {!application.jobId?.isDeleted && (typeof application.jobId === 'string' || application.jobId?._id) && (
                          <button
                            onClick={() =>
                              navigate(`/candidate/jobs/${typeof application.jobId === 'string' ? application.jobId : application.jobId._id}`)
                            }
                            className="flex-1 sm:flex-none px-4 py-2 bg-white border-2 border-zinc-200 text-zinc-700 rounded-xl text-sm font-bold hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900 transition-all flex items-center justify-center gap-1.5"
                          >
                            <ExternalLink className="w-4 h-4" />
                            View Job
                          </button>
                        )}

                      {application.status === 'Applied' && (
                        <div className="flex items-center">
                          {!withdrawingAppId || withdrawingAppId !== application.applicationId ? (
                            <button
                              onClick={() => setWithdrawingAppId(application.applicationId)}
                              className="flex-1 sm:flex-none px-4 py-2 bg-white border-2 border-rose-200 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 transition-all flex items-center justify-center gap-1.5 group/withdraw"
                            >
                              <XCircle className="w-4 h-4 text-rose-400 group-hover/withdraw:text-rose-500" />
                              Withdraw
                            </button>
                          ) : (
                            <div className="flex items-center justify-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl shadow-sm animate-in fade-in duration-200 flex-1 sm:flex-none">
                              <span className="text-[13px] font-bold text-rose-700">Are you sure?</span>
                              <button
                                onClick={() => handleWithdrawApplication(application.applicationId)}
                                disabled={loading.withdrawing}
                                className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-all disabled:opacity-50 flex items-center gap-1.5"
                              >
                                {loading.withdrawing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                                Yes
                              </button>
                              <button
                                onClick={() => setWithdrawingAppId(null)}
                                disabled={loading.withdrawing}
                                className="px-3 py-1.5 bg-white text-zinc-600 border border-zinc-200 rounded-lg text-xs font-bold hover:bg-zinc-50 transition-all disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      </div>

                      {application.status === 'Interviewed' && (!application.reInterviewRequest || application.reInterviewRequest.status === 'none' || application.reInterviewRequest.status === 'denied') && (
                        <button
                          onClick={() => setReInterviewDialogApp(application)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-all shadow-sm"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Request Re-Interview
                        </button>
                      )}

                      {application.status === 'Interview Scheduled' && (() => {
                        const active = isInterviewWindowActive(application);
                        const windowLabel = formatInterviewWindow(application);
                        const now = new Date();
                        const start = application.interviewWindowStart ? new Date(application.interviewWindowStart) : null;
                        const end = application.interviewWindowEnd ? new Date(application.interviewWindowEnd) : null;
                        const beforeStart = start && !Number.isNaN(start.getTime()) ? now < start : false;
                        const afterDeadline = end && !Number.isNaN(end.getTime()) ? now > end : false;
                        const interviewLocked = Boolean(application.interviewLocked);
                        const voiceEnrollmentStatus = application.voiceEnrollment?.status;
                        const faceEnrollmentStatus = application.faceEnrollment?.status;
                        const enrollmentsReady = voiceEnrollmentStatus === 'enrolled' && faceEnrollmentStatus === 'enrolled';
                        const enrollmentFailed = voiceEnrollmentStatus === 'failed' || faceEnrollmentStatus === 'failed';
                        const ctaDisabled = interviewLocked || !active || !enrollmentsReady;
                        const ctaTitle = interviewLocked
                          ? 'Interview already submitted. Results are being evaluated.'
                          : !enrollmentsReady
                            ? 'Interview setup is in progress. Please wait for audio and video verification to complete.'
                            : beforeStart
                              ? start
                                ? `Interview starts at ${start.toLocaleString()}`
                                : 'Interview start time not set'
                              : afterDeadline
                                ? end
                                  ? `Interview deadline was ${end.toLocaleString()}`
                                  : 'Interview deadline not set'
                                : active
                                  ? 'Give your interview now'
                                  : 'Interview window is not available';
                        const ctaLabel = interviewLocked
                          ? 'Interview Submitted'
                          : beforeStart
                            ? 'Starts Soon'
                            : active
                              ? 'Give Interview'
                              : 'Window Closed';

                        return (
                          <div className="flex w-full flex-col gap-2 md:w-auto md:items-end mt-4 sm:mt-0">
                            {windowLabel && (
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-zinc-500 font-medium whitespace-nowrap">Interview Slot</span>
                                <div className="flex flex-col gap-1.5 text-zinc-900 font-bold bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg shadow-sm text-left">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-zinc-400" />
                                    <span>{windowLabel.start}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-zinc-500 text-xs">
                                    <div className="w-4 flex justify-center text-zinc-300">↓</div>
                                    <span>{windowLabel.end}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                            {interviewLocked && (
                              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide md:max-w-[290px] md:text-right flex items-center justify-end gap-1.5 pt-1.5">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Review in Progress
                              </span>
                            )}
                            {!enrollmentsReady && !interviewLocked && (
                              <span className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-zinc-200/60 bg-zinc-50 uppercase tracking-wide md:max-w-[290px] md:text-right flex items-start gap-1.5" title={ctaTitle}>
                                {enrollmentFailed
                                  ? <span className="flex text-rose-600 gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> Setup Failed</span>
                                  : <span className="flex text-zinc-500 gap-1.5"><RefreshCw className="w-3.5 h-3.5 flex-shrink-0 mt-px animate-spin" /> Setup in Progress</span>}
                              </span>
                            )}
                            {enrollmentsReady && (
                              <button
                                disabled={ctaDisabled}
                                onClick={() =>
                                  navigate(`/candidate/interview/${application.applicationId}`, {
                                    state: {
                                      jobTitle: application.jobId?.title,
                                      jobId: application.jobId?._id,
                                      applicationId: application.applicationId,
                                    },
                                  })
                                }
                                title={ctaTitle}
                                className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all mt-1.5 w-full md:min-w-[190px] group/interview hover:-translate-y-[1px] ${
                                  !ctaDisabled
                                    ? 'bg-zinc-900 border border-zinc-900 text-white hover:bg-zinc-800 shadow-sm hover:shadow-md'
                                    : 'bg-zinc-100 border border-zinc-200 text-zinc-400 cursor-not-allowed hover:-translate-y-0'
                                }`}
                              >
                                <Video className={`w-4 h-4 ${!ctaDisabled ? 'text-zinc-400 group-hover/interview:text-white transition-colors' : ''}`} />
                                {ctaLabel}
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                    );
                  })()}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {applicationsPagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-10 gap-4">
             <div className="text-[13px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-100/50 px-3 py-1.5 rounded-lg border border-zinc-200 w-fit">
              <span className="text-zinc-900">{((currentPage - 1) * 10) + 1} - {Math.min(currentPage * 10, applicationsPagination.totalApplications)}</span> OF <span className="text-zinc-900">{applicationsPagination.totalApplications}</span> APPS
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={!applicationsPagination.hasPrevPage}
                className="px-4 py-2 bg-white border-2 border-zinc-200 text-zinc-700 rounded-xl text-sm font-bold hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900"
              >
                Previous
              </button>
              
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: applicationsPagination.totalPages }, (_, i) => i + 1)
                  .filter(page => 
                    page === 1 || 
                    page === applicationsPagination.totalPages || 
                    Math.abs(page - currentPage) <= 1
                  )
                  .map((page, index, array) => (
                    <React.Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className="px-2 font-bold text-zinc-300 tracking-widest text-lg">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`w-10 h-10 rounded-xl text-sm font-bold flex items-center justify-center transition-all border-2 ${
                          currentPage === page
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900'
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
                className="px-4 py-2 bg-white border-2 border-zinc-200 text-zinc-700 rounded-xl text-sm font-bold hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Re-Interview Request Dialog */}
      <ReInterviewRequestDialog
        open={Boolean(reInterviewDialogApp)}
        onClose={() => setReInterviewDialogApp(null)}
        onSubmit={handleRequestReInterview}
        loading={reInterviewLoading}
        application={reInterviewDialogApp}
      />
    </div>
  );
};

export default MyApplications;