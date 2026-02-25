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
  RefreshCw
} from 'lucide-react';
import api from '../../lib/api';

const ApplicationDetails = () => {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
          
          <div className="flex items-center justify-between">
            <div className={`px-4 py-2 rounded-full text-sm font-medium border flex items-center gap-2 ${getStatusColor(application.status)}`}>
              {getStatusIcon(application.status)}
              {application.status}
            </div>
            
            <div className="flex items-center gap-3">
              {application.jobId && (
                <button
                  onClick={() => navigate(`/jobs/${application.jobId._id}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Job Posting
                </button>
              )}
              {application.status === 'Interview Scheduled' && (() => {
                const now = new Date();
                const deadline = application.interviewWindowEnd
                  ? new Date(application.interviewWindowEnd)
                  : null;
                if (deadline) deadline.setHours(23, 59, 59, 999);
                const active = deadline ? now <= deadline : true;
                return (
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
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      active
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm hover:shadow-md'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    {active ? 'Give Interview' : 'Deadline Passed'}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetails;