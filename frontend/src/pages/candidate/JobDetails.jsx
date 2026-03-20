import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Clock,
  DollarSign,
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

const JobDetails = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [checkingApplication, setCheckingApplication] = useState(false);

  useEffect(() => {
    fetchJobDetails();
    checkApplicationStatus();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/jobs/${jobId}`);
      setJob(response.data.data);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Error Loading Job</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/candidate/jobs')}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Back to Jobs
            </button>
            <button
              onClick={fetchJobDetails}
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

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Briefcase className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Job Not Found</h2>
          <p className="text-slate-600 mb-4">The job you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/candidate/jobs')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Jobs
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
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
              <p className="text-slate-600">{job.company}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{job.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{job.employmentType}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Posted {job.postedAgo}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{job.applicationsCount || 0} applicants</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Bookmark className="w-5 h-5 text-slate-600" />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Share2 className="w-5 h-5 text-slate-600" />
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
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Job Description</h2>
              <div className="prose prose-sm max-w-none">
                <p className="text-slate-700 whitespace-pre-wrap">{job.description}</p>
              </div>
            </motion.div>

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Requirements
                </h2>
                <ul className="space-y-2">
                  {job.requirements.map((requirement, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-slate-700">{requirement}</span>
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
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Required Skills
                </h2>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
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
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
              >
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Benefits
                </h2>
                <ul className="space-y-2">
                  {job.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">{benefit}</span>
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
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
            >
              {checkingApplication ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-slate-600">Checking application status...</p>
                </div>
              ) : applicationStatus?.hasApplied ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="font-medium text-slate-900">Already Applied</p>
                    <p className="text-sm text-slate-600">
                      Applied {applicationStatus.application.appliedAgo}
                    </p>
                    <p className="text-sm text-slate-600">
                      Status: <span className="font-medium">{applicationStatus.application.status}</span>
                    </p>
                  </div>
                  <button
                    onClick={handleApplyClick}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Application
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={handleApplyClick}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Apply Now
                  </button>
                  <p className="text-xs text-slate-500 text-center">
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
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Job Information</h2>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Salary</p>
                    <p className="font-medium">{formatSalary(job.salaryRange)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Experience Level</p>
                    <p className="font-medium">{job.experienceLevel}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Category</p>
                    <p className="font-medium">{job.category}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Employment Type</p>
                    <p className="font-medium">{job.employmentType}</p>
                  </div>
                </div>
                
                {job.applicationDeadline && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Application Deadline</p>
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
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-6"
            >
              <h2 className="text-lg font-semibold text-slate-900 mb-4">About Company</h2>
              
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-slate-900">{job.company}</h3>
                  <p className="text-sm text-slate-600">{job.location}</p>
                </div>
                
                {job.employer?.name && job.employer.name !== job.company && (
                  <div>
                    <p className="text-sm text-slate-500">Employer</p>
                    <p className="font-medium">{job.employer.name}</p>
                  </div>
                )}
                
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{job.viewsCount || 0} views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{job.applicationsCount || 0} applicants</span>
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