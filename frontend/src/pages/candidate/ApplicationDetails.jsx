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
  Eye,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import api from '../../lib/api';
import InterviewSlotCard from '../../components/candidate/InterviewSlotCard';
import ReInterviewRequestDialog, { ReInterviewStatusBadge } from '../../components/candidate/ReInterviewRequestDialog';
import { requestReInterview } from '../../services/api/applicationApi';

const ApplicationDetails = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reInterviewDialogOpen, setReInterviewDialogOpen] = useState(false);
  const [reInterviewLoading, setReInterviewLoading] = useState(false);

  useEffect(() => {
    fetchApplicationDetails();
  }, [applicationId]);

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
      'Applied': 'bg-blue-100 text-blue-800 border-blue-200',
      'Under Review': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Shortlisted': 'bg-purple-100 text-purple-800 border-purple-200',
      'Interview Scheduled': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Job Closed': 'bg-amber-100 text-amber-800 border-amber-200',
      'Job Deleted': 'bg-slate-200 text-slate-800 border-slate-300',
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
      'Job Closed': <AlertCircle className="w-4 h-4" />,
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
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading application details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Error Loading Application</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/candidate/applications')}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Back to Applications
            </button>
            <button
              onClick={fetchApplicationDetails}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Application Not Found</h2>
          <p className="text-slate-600 mb-4">The application you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/candidate/applications')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Applications
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/candidate/applications')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Application Details</h1>
              <p className="text-slate-600">Application ID: {application.applicationId}</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className={`px-4 py-2 rounded-full text-sm font-medium border flex items-center gap-2 ${getStatusColor(application.status)}`}>
              {getStatusIcon(application.status)}
              {application.status}
            </div>
            
            <div className="flex w-full flex-col gap-3 md:w-auto md:items-end">
              {applicationJobId && !application.jobId?.isDeleted && (
                <button
                  onClick={() => navigate(`/candidate/jobs/${applicationJobId}`)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 md:min-w-[190px]"
                >
                  <ExternalLink className="w-4 h-4" />
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
                  <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
                    {hasValidStart && hasValidDeadline && (
                      <InterviewSlotCard
                        start={formatDateTime(start)}
                        end={formatDateTime(deadline)}
                        className="md:w-[320px]"
                      />
                    )}
                    {interviewLocked && (
                      <span className="text-xs text-slate-500 md:max-w-[320px] md:text-right">Your interview is under review.</span>
                    )}
                    {!interviewLocked && beforeStart && (
                      <span className="text-xs text-slate-500 md:max-w-[320px] md:text-right">
                        Starts at {formatDateTime(start)}.
                      </span>
                    )}
                    {!enrollmentsReady && !interviewLocked && (
                      <span className="text-xs text-slate-500 md:max-w-[320px] md:text-right">
                        {enrollmentFailed
                          ? 'Interview setup failed. Please contact support or ask the employer to reschedule.'
                          : 'Interview setup in progress. Please wait...'}
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
                        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all md:min-w-[190px] ${
                          !ctaDisabled
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Video className="w-4 h-4" />
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {application.status === 'Job Closed' && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This role has been closed by the employer. Hiring is paused for this job.
          </div>
        )}

        {application.status === 'Job Deleted' && (
          <div className="mb-6 rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-800">
            This role was deleted by the employer. This application remains visible for record-keeping.
          </div>
        )}

        {application.status === 'Interview Scheduled' && application.jobId?.status === 'closed' && (
          <div className="mb-6 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            The job is closed for new applicants, but your scheduled interview is still active.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Job Information
              </h2>
              
              {application.jobId ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">{application.jobId.title}</h3>
                    <p className="text-slate-600">{application.jobId.company}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{application.jobId.location}</span>
                    </div>
                    {application.jobId.employmentType && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{application.jobId.employmentType}</span>
                      </div>
                    )}
                  </div>
                  
                  {application.jobId.salaryRange && (
                    <div className="text-sm text-slate-600">
                      <strong>Salary:</strong> ${application.jobId.salaryRange.min?.toLocaleString()} - ${application.jobId.salaryRange.max?.toLocaleString()}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500">Job information not available</p>
              )}
            </motion.div>

            {/* Personal Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Name</p>
                    <p className="font-medium">{application.applicationProfile?.personalInfo?.name || 'Not provided'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="font-medium">{application.applicationProfile?.personalInfo?.email || 'Not provided'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Phone</p>
                    <p className="font-medium">{application.applicationProfile?.personalInfo?.phone || 'Not provided'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Location</p>
                    <p className="font-medium">{application.applicationProfile?.personalInfo?.location || 'Not provided'}</p>
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
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Cover Letter
                </h2>
                <div className="prose prose-sm max-w-none">
                  <p className="text-slate-700 whitespace-pre-wrap">{application.coverLetter}</p>
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
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Application Timeline
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-slate-900">Application Submitted</p>
                    <p className="text-sm text-slate-500">{formatDate(application.appliedAt)}</p>
                  </div>
                </div>
                
                {application.reviewedAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-slate-900">Under Review</p>
                      <p className="text-sm text-slate-500">{formatDate(application.reviewedAt)}</p>
                    </div>
                  </div>
                )}
                
                {application.lastUpdated && application.lastUpdated !== application.appliedAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-slate-900">Status Updated</p>
                      <p className="text-sm text-slate-500">{formatDate(application.lastUpdated)}</p>
                    </div>
                  </div>
                )}

                {application.interviewWindowStart && application.interviewWindowEnd && (
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-slate-900">Interview Slot</p>
                      <p className="text-sm text-slate-500">Opens: {formatDate(application.interviewWindowStart)}</p>
                      <p className="text-sm text-slate-500">Closes: {formatDate(application.interviewWindowEnd)}</p>
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
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Resume
              </h2>
              
              {application.resume ? (
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-slate-900">{application.resume.originalName || application.resume.filename}</p>
                    <p className="text-sm text-slate-500">
                      Uploaded: {formatDate(application.resume.uploadDate)}
                    </p>
                    {application.resume.fileSize && (
                      <p className="text-sm text-slate-500">
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
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Resume
                  </button>
                </div>
              ) : (
                <p className="text-slate-500">No resume attached</p>
              )}
            </motion.div>

            {/* Employer Notes */}
            {application.employerNotes && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Employer Notes</h2>
                <p className="text-slate-700 whitespace-pre-wrap">{application.employerNotes}</p>
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