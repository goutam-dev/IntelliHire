import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  Calendar,
  Users,
  Eye,
  Bookmark,
  Share2,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  Star,
  Award,
  Briefcase
} from 'lucide-react';
import api from '../../lib/api';
import { getCurrencySymbol } from '../../constants/jobConstants';
import { resolveUploadUrl } from '../../utils/mediaUrl';

import SkeletonLoader from '../../components/common/SkeletonLoader';

const JobDetails = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [checkingApplication, setCheckingApplication] = useState(false);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  useEffect(() => {
    fetchJobDetails();
    checkApplicationStatus();
  }, [jobId]);

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [job?.companyLogoUrl]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/jobs/${jobId}`);
      const payload = response.data?.data ?? response.data;
      setJob(payload || null);
    } catch (error) {
      console.error('Error fetching job details:', error);
      setError(error.response?.data?.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const checkApplicationStatus = async () => {
    try {
      setCheckingApplication(true);
      const response = await api.get(`/job-applications/check/${jobId}`);
      setApplicationStatus(response.data.data);
    } catch (error) {
      console.error('Error checking application status:', error);
      // Don't set error for this, as it's not critical
    } finally {
      setCheckingApplication(false);
    }
  };

  const handleApplyClick = () => {
    if (applicationStatus?.hasApplied) {
      // Navigate to application details
      navigate(`/candidate/applications/${applicationStatus.application.applicationId}`);
    } else {
      // Navigate to application form
      navigate(`/candidate/apply/${jobId}`);
    }
  };

  const formatSalary = (salaryRange) => {
    if (!salaryRange || (!salaryRange.min && !salaryRange.max)) {
      return 'Salary not disclosed';
    }
    
    const symbol = getCurrencySymbol(salaryRange.currency || 'USD');
    const min = salaryRange.min ? `${symbol}${salaryRange.min.toLocaleString()}` : '';
    const max = salaryRange.max ? `${symbol}${salaryRange.max.toLocaleString()}` : '';
    
    if (min && max) {
      return `${min} - ${max}`;
    } else if (min) {
      return `From ${min}`;
    } else if (max) {
      return `Up to ${max}`;
    }
    
    return 'Salary not disclosed';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const hasSalaryRange = Boolean(job?.salaryRange && (job.salaryRange.min || job.salaryRange.max));
  const salarySymbol = hasSalaryRange ? getCurrencySymbol(job.salaryRange.currency || 'USD') : null;
  const companyName = job?.company || 'Company Name';
  const companyInitial = (companyName[0] || 'C').toUpperCase();
  const companyLogoUrl = resolveUploadUrl(job?.companyLogoUrl || job?.employer?.logoUrl || null);

  if (loading) {
    return <SkeletonLoader type="layout-profile" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50/50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">Error Loading Job</h2>
          <p className="text-zinc-600 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/candidate/jobs')}
              className="px-4 py-2 bg-zinc-600 text-white rounded-xl hover:bg-zinc-700 transition-colors"
            >
              Back to Jobs
            </button>
            <button
              onClick={fetchJobDetails}
              className="px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-zinc-50/50 flex items-center justify-center">
        <div className="text-center">
          <Briefcase className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">Job Not Found</h2>
          <p className="text-zinc-600 mb-4">The job you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/candidate/jobs')}
            className="px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors"
          >
            Browse Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-30 shadow-sm">
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-zinc-50 to-transparent pointer-events-none"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 relative">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-zinc-100 rounded-xl transition-colors shadow-sm bg-white border border-zinc-200"
            >
              <ArrowLeft className="w-5 h-5 text-zinc-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight mb-2">{job.title}</h1>
              <div className="text-zinc-600 font-medium text-lg flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-zinc-200 overflow-hidden flex items-center justify-center text-[11px] font-extrabold text-zinc-700 border border-zinc-300">
                  {companyLogoUrl && !logoLoadFailed ? (
                    <img
                      src={companyLogoUrl}
                      alt={`${companyName} logo`}
                      className="w-full h-full object-cover"
                      onError={() => setLogoLoadFailed(true)}
                    />
                  ) : (
                    companyInitial
                  )}
                </div>
                <span>{companyName}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm font-bold text-zinc-500 uppercase tracking-wider">
              <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200/60 px-2.5 py-1 rounded-md">
                <MapPin className="w-4 h-4" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200/60 px-2.5 py-1 rounded-md">
                <Clock className="w-4 h-4" />
                <span>{job.employmentType}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200/60 px-2.5 py-1 rounded-md">
                <Calendar className="w-4 h-4" />
                <span>Posted {job.postedAgo}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
                <Bookmark className="w-5 h-5 text-zinc-600" />
              </button>
              <button className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
                <Share2 className="w-5 h-5 text-zinc-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6 overflow-hidden"
            >
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Job Description</h2>
              <div className="prose prose-sm max-w-none">
                <p className="text-zinc-700 whitespace-pre-wrap break-words overflow-wrap-anywhere">{job.description}</p>
              </div>
            </motion.div>

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6"
              >
                <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Requirements
                </h2>
                <ul className="space-y-2">
                  {job.requirements.map((requirement, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-zinc-900 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-zinc-700">{requirement}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6"
              >
                <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Required Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Benefits */}
            {job.benefits && job.benefits.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6"
              >
                <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Benefits
                </h2>
                <ul className="space-y-2">
                  {job.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-zinc-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6"
            >
              {checkingApplication ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-900 mx-auto mb-2"></div>
                  <p className="text-sm text-zinc-600">Checking application status...</p>
                </div>
              ) : applicationStatus?.hasApplied ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="font-medium text-zinc-900">Already Applied</p>
                    <p className="text-sm text-zinc-600">
                      Applied {applicationStatus.application.appliedAgo}
                    </p>
                    <p className="text-sm text-zinc-600">
                      Status: <span className="font-medium">{applicationStatus.application.status}</span>
                    </p>
                  </div>
                  <button
                    onClick={handleApplyClick}
                    className="w-full px-4 py-3 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Application
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={handleApplyClick}
                    className="w-full px-4 py-3 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors font-medium"
                  >
                    Apply Now
                  </button>
                  <p className="text-xs text-zinc-500 text-center">
                    By applying, you agree to our terms and conditions
                  </p>
                </div>
              )}
            </motion.div>

            {/* Job Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6"
            >
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">Job Information</h2>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {salarySymbol && (
                    <span className="w-4 h-4 inline-flex items-center justify-center text-xs font-semibold text-zinc-500">
                      {salarySymbol}
                    </span>
                  )}
                  <div>
                    <p className="text-sm text-zinc-500">Salary</p>
                    <p className="font-medium">{formatSalary(job.salaryRange)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Briefcase className="w-4 h-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-500">Experience Level</p>
                    <p className="font-medium">{job.experienceLevel}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-500">Category</p>
                    <p className="font-medium">{job.category}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  <div>
                    <p className="text-sm text-zinc-500">Employment Type</p>
                    <p className="font-medium">{job.employmentType}</p>
                  </div>
                </div>
                
                {job.applicationDeadline && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <div>
                      <p className="text-sm text-zinc-500">Application Deadline</p>
                      <p className="font-medium">{formatDate(job.applicationDeadline)}</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Company Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6"
            >
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">About Company</h2>
              
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-zinc-900">{job.company}</h3>
                  <p className="text-sm text-zinc-600">{job.location}</p>
                </div>
                
                {job.employer?.name && job.employer.name !== job.company && (
                  <div>
                    <p className="text-sm text-zinc-500">Employer</p>
                    <p className="font-medium">{job.employer.name}</p>
                  </div>
                )}
                
                <div className="pt-3 border-t border-zinc-100">
                  <div className="flex items-center gap-4 text-sm text-zinc-600">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{job.viewsCount || 0} views</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetails;