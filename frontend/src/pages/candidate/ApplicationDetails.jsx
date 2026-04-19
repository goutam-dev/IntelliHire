import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Video } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  ExternalLink,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import api from '../../lib/api';
import InterviewSlotCard from '../../components/candidate/InterviewSlotCard';
import ReInterviewRequestDialog, { ReInterviewStatusBadge } from '../../components/candidate/ReInterviewRequestDialog';
import { requestReInterview } from '../../services/api/applicationApi';
import { resolveUploadUrl } from '../../utils/mediaUrl';

import SkeletonLoader from '../../components/common/SkeletonLoader';

const ApplicationDetails = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reInterviewDialogOpen, setReInterviewDialogOpen] = useState(false);
  const [reInterviewLoading, setReInterviewLoading] = useState(false);
  const [companyLogoLoadFailed, setCompanyLogoLoadFailed] = useState(false);

  useEffect(() => {
    fetchApplicationDetails();
  }, [applicationId]);

  useEffect(() => {
    setCompanyLogoLoadFailed(false);
  }, [application?.jobId?.companyLogoUrl]);

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/job-applications/${applicationId}`);
      setApplication(response.data.data);
    } catch (error) {
      console.error('Error fetching application details:', error);
      setError(error.response?.data?.message || 'Failed to load application details');
    } finally {
      setLoading(false);
    }
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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const applicationJobId = typeof application?.jobId === 'string'
    ? application.jobId
    : application?.jobId?._id;
  const isJobClosed = application?.jobId?.status === 'closed';
  const closedAt = application?.jobId?.closedAt ? new Date(application.jobId.closedAt) : null;
  const closedAtLabel = closedAt && !Number.isNaN(closedAt.getTime())
    ? closedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  const companyName = application?.jobId?.company || 'Unknown Company';
  const companyInitial = (companyName[0] || 'C').toUpperCase();
  const companyLogoUrl = resolveUploadUrl(
    application?.jobId?.companyLogoUrl || application?.companyLogoUrl || null
  );

  const handleRequestReInterview = async (reason) => {
    setReInterviewLoading(true);
    try {
      await requestReInterview(application.applicationId, { reason });
      setReInterviewDialogOpen(false);
      fetchApplicationDetails();
    } catch (err) {
      console.error('Failed to request re-interview:', err);
      alert(err?.response?.data?.message || 'Failed to submit re-interview request.');
    } finally {
      setReInterviewLoading(false);
    }
  };

  if (loading) {
    return <SkeletonLoader type="layout-profile" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50/50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-zinc-900 mb-2 tracking-tight">Error Loading Application</h2>
          <p className="text-zinc-600 mb-6 font-medium">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/candidate/applications')}
              className="px-5 py-2.5 bg-white border-2 border-zinc-200 text-zinc-700 font-bold rounded-xl hover:bg-zinc-50 hover:border-zinc-300 transition-colors"
            >
              Back
            </button>
            <button
              onClick={fetchApplicationDetails}
              className="px-5 py-2.5 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className="w-4 h-4 text-zinc-400" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-zinc-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-zinc-400" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-2 tracking-tight">Application Not Found</h2>
          <p className="text-zinc-600 mb-6 font-medium">The application you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/candidate/applications')}
            className="px-6 py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors shadow-sm"
          >
            Back to Applications
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex items-center gap-4 mb-5">
            <button
              onClick={() => navigate('/candidate/applications')}
              className="p-2 hover:bg-zinc-100 rounded-xl transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-500 group-hover:text-zinc-900" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">Application Details</h1>
              <p className="text-zinc-500 text-sm font-medium mt-1 uppercase tracking-widest">{application.jobId?.title || 'Unknown Role'} at {application.jobId?.company || 'Unknown Company'}</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border flex items-center w-fit gap-1.5 ${getStatusColor(application.status)}`}>
              {getStatusIcon(application.status)}
              {application.status}
            </div>
            
            <div className="flex w-full flex-col gap-16 md:w-auto md:flex-row md:items-center">
              {applicationJobId && !application.jobId?.isDeleted && (
                <button
                  onClick={() => navigate(`/candidate/jobs/${applicationJobId}`)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-zinc-700 font-bold transition-all hover:bg-zinc-50 hover:border-zinc-300 md:min-w-[190px] shadow-sm"
                >
                  <ExternalLink className="w-4 h-4 text-zinc-400" />
                  View Job Posting
                </button>
              )}
              {application.status === 'Interview Scheduled' && (() => {
                const formatDateTime = (value) => value.toLocaleString(undefined, {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const now = new Date();
                const start = application.interviewWindowStart
                  ? new Date(application.interviewWindowStart)
                  : null;
                const deadline = application.interviewWindowEnd
                  ? new Date(application.interviewWindowEnd)
                  : null;
                const hasValidStart = start && !Number.isNaN(start.getTime());
                const hasValidDeadline = deadline && !Number.isNaN(deadline.getTime());
                const beforeStart = hasValidStart ? now < start : false;
                const afterDeadline = hasValidDeadline ? now > deadline : false;
                const active = hasValidStart && hasValidDeadline ? now >= start && now <= deadline : false;
                const interviewLocked = Boolean(application.interviewLocked);
                const voiceEnrollmentStatus = application.voiceEnrollment?.status;
                const faceEnrollmentStatus = application.faceEnrollment?.status;
                const enrollmentsReady = voiceEnrollmentStatus === 'enrolled' && faceEnrollmentStatus === 'enrolled';
                const enrollmentFailed = voiceEnrollmentStatus === 'failed' || faceEnrollmentStatus === 'failed';
                const ctaDisabled = interviewLocked || !active || !enrollmentsReady;
                const ctaLabel = interviewLocked
                  ? 'Interview Submitted'
                  : beforeStart
                    ? 'Starts Soon'
                    : active
                      ? 'Give Interview'
                      : 'Window Closed';
                return (
                  <div className="flex w-full flex-col gap-2 md:w-auto md:items-end md:mt-0 mt-4">
                    {hasValidStart && hasValidDeadline && (
                      <div className="flex items-center gap-3 text-sm mb-2 md:mb-0">
                        <span className="text-zinc-500 font-medium whitespace-nowrap">Interview Slot</span>
                        <div className="flex flex-col gap-1.5 text-zinc-900 font-bold bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg shadow-sm text-left">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-zinc-400" />
                            <span>{formatDateTime(start)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-zinc-500 text-xs">
                            <div className="w-4 flex justify-center text-zinc-300">↓</div>
                            <span>{formatDateTime(deadline)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    {interviewLocked && (
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide md:max-w-[320px] md:text-right flex items-center justify-end gap-1.5 pt-1.5">
                         <CheckCircle className="w-3.5 h-3.5" />
                         Your interview is being evaluated
                      </span>
                    )}
                    {!interviewLocked && beforeStart && (
                      <span className="text-xs font-bold text-cyan-600 bg-cyan-50 border border-cyan-200/60 px-2 py-1 rounded md:max-w-[320px] md:text-right tracking-wide uppercase">
                        Starts at {formatDateTime(start)}
                      </span>
                    )}
                    {!enrollmentsReady && !interviewLocked && (
                      <span className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-zinc-200/60 bg-zinc-50 uppercase tracking-wide md:max-w-[320px] md:text-right flex items-start gap-1.5 mt-1">
                        {enrollmentFailed
                          ? <span className="flex text-rose-600 gap-1.5"><AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-px" /> Setup Failed. Contact support.</span>
                          : <span className="flex text-zinc-500 gap-1.5"><RefreshCw className="w-3.5 h-3.5 flex-shrink-0 mt-px animate-spin" /> Setup in progress...</span>}
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
                        className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all md:min-w-[190px] w-full mt-2 group/interview shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 ${
                          !ctaDisabled
                            ? 'bg-zinc-900 border border-zinc-900 text-white hover:bg-zinc-800 shadow-md hover:-translate-y-[1px]'
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
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {isJobClosed && (
          <div className="mb-6 rounded-xl border border-amber-200/60 bg-amber-50/80 p-4 text-sm font-medium text-amber-800 flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
            This role has been closed by the employer{closedAtLabel ? ` on ${closedAtLabel}` : ''}. Hiring is paused for this job.
          </div>
        )}

        {application.status === 'Job Deleted' && (
          <div className="mb-6 rounded-xl border border-zinc-300 bg-zinc-100 p-4 text-sm font-medium text-zinc-800 flex items-start gap-3 shadow-sm">
             <FileText className="w-5 h-5 flex-shrink-0 text-zinc-500 mt-0.5" />
             This role was deleted by the employer. This application remains visible for record-keeping.
          </div>
        )}

        {application.status === 'Interview Scheduled' && isJobClosed && (
          <div className="mb-6 rounded-xl border border-cyan-200/60 bg-cyan-50/80 p-4 text-sm font-medium text-cyan-800 flex items-start gap-3 shadow-sm">
             <Calendar className="w-5 h-5 flex-shrink-0 text-cyan-600 mt-0.5" />
             The job is closed for new applicants, but your scheduled interview is still active.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 sm:p-8"
            >
              <h2 className="text-sm font-bold text-zinc-900 mb-5 tracking-widest uppercase flex items-center gap-2">
                <Building2 className="w-4 h-4 text-zinc-400" />
                Job Information
              </h2>
              
              {application.jobId ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight mb-1">{application.jobId.title}</h3>
                    <div className="text-zinc-600 font-medium flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-zinc-200 overflow-hidden flex items-center justify-center text-[11px] font-extrabold text-zinc-700 border border-zinc-300">
                        {companyLogoUrl && !companyLogoLoadFailed ? (
                          <img
                            src={companyLogoUrl}
                            alt={`${companyName} logo`}
                            className="w-full h-full object-cover"
                            onError={() => setCompanyLogoLoadFailed(true)}
                          />
                        ) : (
                          companyInitial
                        )}
                      </div>
                      <span>{companyName}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-zinc-500 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200/60 px-2.5 py-1 rounded-md">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{application.jobId.location}</span>
                    </div>
                    {application.jobId.employmentType && (
                      <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200/60 px-2.5 py-1 rounded-md">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{application.jobId.employmentType}</span>
                      </div>
                    )}
                  </div>
                  
                  {application.jobId.salaryRange && (
                    <div className="text-sm text-zinc-600 font-medium pt-2 border-t border-zinc-100">
                      <strong className="text-zinc-900 mr-2">Salary:</strong> 
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200/60 font-bold">
                        ${application.jobId.salaryRange.min?.toLocaleString()} - ${application.jobId.salaryRange.max?.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-zinc-500 text-sm font-medium italic">Job information not available</p>
              )}
            </motion.div>

            {/* Personal Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 sm:p-8"
            >
              <h2 className="text-sm font-bold text-zinc-900 mb-6 tracking-widest uppercase flex items-center gap-2">
                <User className="w-4 h-4 text-zinc-400" />
                Applied With Info
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-zinc-50/50 border border-zinc-200/60 p-5 rounded-xl">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-zinc-400 mt-0.5" />
                  <div>
                     <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Name</p>
                    <p className="font-bold text-zinc-900 text-sm">{application.applicationProfile?.personalInfo?.name || 'Not provided'}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-zinc-400 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Email</p>
                    <p className="font-bold text-zinc-900 text-sm">{application.applicationProfile?.personalInfo?.email || 'Not provided'}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-zinc-400 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Phone</p>
                    <p className="font-bold text-zinc-900 text-sm">{application.applicationProfile?.personalInfo?.phone || 'Not provided'}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-zinc-400 mt-0.5" />
                  <div>
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Location</p>
                    <p className="font-bold text-zinc-900 text-sm">{application.applicationProfile?.personalInfo?.location || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Cover Letter */}
            {application.coverLetter && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 sm:p-8"
              >
                <h2 className="text-sm font-bold text-zinc-900 mb-5 tracking-widest uppercase flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-400" />
                  Cover Letter
                </h2>
                <div className="bg-zinc-50/80 border border-zinc-200/60 p-5 rounded-xl overflow-hidden">
                  <p className="text-zinc-700 text-sm leading-relaxed whitespace-pre-wrap font-medium break-words overflow-wrap-anywhere">{application.coverLetter}</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Application Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6"
            >
              <h2 className="text-sm font-bold text-zinc-900 mb-6 tracking-widest uppercase flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-400" />
                Timeline
              </h2>
              
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <div className="w-2.5 h-2.5 bg-cyan-600 rounded-full mt-1.5 shadow-sm border-2 border-white ring-1 ring-cyan-600/30"></div>
                  <div>
                    <p className="font-bold text-zinc-900 text-sm">Application Submitted</p>
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{formatDate(application.appliedAt)}</p>
                  </div>
                </div>
                
                {application.reviewedAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 bg-amber-500 rounded-full mt-1.5 shadow-sm border-2 border-white ring-1 ring-amber-500/30"></div>
                    <div>
                      <p className="font-bold text-zinc-900 text-sm">Application Reviewed</p>
                      <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{formatDate(application.reviewedAt)}</p>
                    </div>
                  </div>
                )}
                
                {application.lastUpdated && application.lastUpdated !== application.appliedAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mt-1.5 shadow-sm border-2 border-white ring-1 ring-emerald-500/30"></div>
                    <div>
                      <p className="font-bold text-zinc-900 text-sm">Status Updated</p>
                      <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{formatDate(application.lastUpdated)}</p>
                    </div>
                  </div>
                )}

                {application.interviewWindowStart && application.interviewWindowEnd && (
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 bg-sky-600 rounded-full mt-1.5 shadow-sm border-2 border-white ring-1 ring-sky-600/30"></div>
                    <div>
                      <p className="font-bold text-zinc-900 text-sm">Interview Slot</p>
                      <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5 whitespace-nowrap">Opens: {formatDate(application.interviewWindowStart)}</p>
                      <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5 whitespace-nowrap">Closes: {formatDate(application.interviewWindowEnd)}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Resume Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6"
            >
              <h2 className="text-sm font-bold text-zinc-900 mb-6 tracking-widest uppercase flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                Resume
              </h2>
              
              {application.resume ? (
                <div className="space-y-4">
                  <div className="bg-zinc-50 border border-zinc-200/60 p-4 rounded-xl text-center">
                    <p className="font-bold text-zinc-900 text-sm break-all truncate" title={application.resume.originalName || application.resume.filename}>
                      {application.resume.originalName || application.resume.filename}
                    </p>
                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mt-2 border-t border-zinc-200/60 pt-2">
                      Uploaded {formatDate(application.resume.uploadDate)}
                    </p>
                    {application.resume.fileSize && (
                      <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                        Size: {(application.resume.fileSize / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => {
                      if (application.resume.filePath) {
                        const link = document.createElement('a');
                        link.href = `http://localhost:4000/${application.resume.filePath}`;
                        link.download = application.resume.originalName || application.resume.filename || 'resume.pdf';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                    }}
                    className="w-full px-5 py-2.5 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900"
                  >
                    <Download className="w-4 h-4 text-zinc-400" />
                    Download Resume
                  </button>
                </div>
              ) : (
                <p className="text-zinc-500 text-sm font-medium italic text-center p-4 bg-zinc-50 rounded-xl border border-zinc-200/60">No resume attached</p>
              )}
            </motion.div>

            {/* Employer Notes */}
            {application.employerNotes && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6"
              >
                <h2 className="text-sm font-bold text-zinc-900 mb-5 tracking-widest uppercase">Employer Notes</h2>
                <div className="bg-amber-50/50 border border-amber-200/60 p-5 rounded-xl overflow-hidden">
                  <p className="text-amber-900 text-sm leading-relaxed whitespace-pre-wrap font-medium break-words overflow-wrap-anywhere">{application.employerNotes}</p>
                </div>
              </motion.div>
            )}

            {/* Re-Interview Request Section */}
            {application.status === 'Interviewed' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5" />
                  Re-Interview
                </h2>

                {application.reInterviewRequest && application.reInterviewRequest.status !== 'none' ? (
                  <ReInterviewStatusBadge reInterviewRequest={application.reInterviewRequest} />
                ) : (
                  <p className="text-sm text-slate-600 mb-4">
                    If your interview was interrupted due to technical issues, you can request a re-interview.
                  </p>
                )}

                {(!application.reInterviewRequest || application.reInterviewRequest.status === 'none' || application.reInterviewRequest.status === 'denied') && (
                  <button
                    onClick={() => setReInterviewDialogOpen(true)}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg shadow-amber-500/25 transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Request Re-Interview
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Re-Interview Request Dialog */}
      <ReInterviewRequestDialog
        open={reInterviewDialogOpen}
        onClose={() => setReInterviewDialogOpen(false)}
        onSubmit={handleRequestReInterview}
        loading={reInterviewLoading}
        application={application}
      />
    </div>
  );
};

export default ApplicationDetails;