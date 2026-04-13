import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Clock,
  Users,
  Eye,
  ExternalLink,
  Building2,
  GraduationCap,
  Bookmark,
  CalendarDays,
  Briefcase,
  CheckCircle,
  AlertCircle,
  Globe,
  Award,
  TrendingUp,
  Shield,
  Heart,
  Zap,
  Target,
  FileText,
  Calendar,
  Star,
  ChevronDown,
  ChevronUp,
  X,
  UserCheck,
  ArrowRight
} from 'lucide-react';
import { getCurrencySymbol } from '../../constants/jobConstants';
import jobApi from '../../services/api/jobApi';

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "backOut"
    }
  }
};


const JobCard = ({ job, index }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [viewCount, setViewCount] = useState(job.viewsCount || job.metadata?.views || 0);

  // Get profile completion data from Redux store
  const { completion, incompleteSections, isComplete } = useSelector(state => state.profileCompletion);
  
  // Get application status from Redux store
  const { applicationStatuses } = useSelector(state => state.jobApplications);
  const applicationStatus = applicationStatuses[job._id];

  useEffect(() => {
    setViewCount(job.viewsCount || job.metadata?.views || 0);
  }, [job._id, job.viewsCount, job.metadata?.views]);

  const trackViewIfNeeded = async () => {
    const viewSessionKey = `job-view-tracked-${job._id}`;
    const hasTrackedInSession = typeof window !== 'undefined' && window.sessionStorage.getItem(viewSessionKey);

    if (hasTrackedInSession) {
      return;
    }

    try {
      const result = await jobApi.incrementJobViews(job._id);
      const nextViews = typeof result?.viewsCount === 'number' ? result.viewsCount : (viewCount + 1);
      setViewCount(nextViews);

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(viewSessionKey, '1');
      }
    } catch (error) {
      console.error('Failed to increment job views:', error);
    }
  };



  const handleViewDetails = async () => {
    const nextExpanded = !isExpanded;
    setIsExpanded(nextExpanded);

    if (!nextExpanded) {
      return;
    }

    await trackViewIfNeeded();
  };

  const handleApplyNow = async () => {
    // Only allow application if profile is complete
    if (!completion || !isComplete || completion.percentage < 100) {
      // Do nothing - button is disabled for incomplete profiles
      return;
    }

    await trackViewIfNeeded();

    // Navigate to job application page with job data
    navigate(`/candidate/apply/${job._id}`, { 
      state: { 
        job: job,
        returnTo: '/candidate/jobs' 
      } 
    });
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const getSalaryDisplay = () => {
    if (!job.salaryRange || (!job.salaryRange.min && !job.salaryRange.max)) {
      return { display: 'Salary not disclosed', range: null, symbol: null };
    }
    
    const { min, max, currency = 'USD' } = job.salaryRange;
    const currencySymbol = getCurrencySymbol(currency);
    const formatSalary = (amount) => Number(amount).toLocaleString('en-US', {
      maximumFractionDigits: 0,
    });

    if (min && max) {
      return { 
        display: `${currencySymbol}${formatSalary(min)} - ${currencySymbol}${formatSalary(max)}`,
        range: `${currencySymbol}${formatSalary(min)} - ${currencySymbol}${formatSalary(max)} per year`,
        symbol: currencySymbol,
      };
    } else if (min) {
      return { 
        display: `${currencySymbol}${formatSalary(min)}+`,
        range: `${currencySymbol}${formatSalary(min)}+ per year`,
        symbol: currencySymbol,
      };
    } else if (max) {
      return { 
        display: `Up to ${currencySymbol}${formatSalary(max)}`,
        range: `Up to ${currencySymbol}${formatSalary(max)} per year`,
        symbol: currencySymbol,
      };
    }
  };

  const getTimeAgo = (date) => {
    if (!date) return 'Recently posted';
    const now = new Date();
    const posted = new Date(date);
    const diffTime = Math.abs(now - posted);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  const getDeadlineStatus = () => {
    if (!job.applicationDeadline) return null;
    
    const deadline = new Date(job.applicationDeadline);
    const now = new Date();
    const diffTime = deadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { 
      text: 'Applications closed', 
      color: 'text-red-600 bg-red-50 border-red-200',
      icon: AlertCircle
    };
    if (diffDays <= 3) return { 
      text: `${diffDays} days left to apply`, 
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      icon: AlertCircle
    };
    if (diffDays <= 7) return { 
      text: `${diffDays} days left to apply`, 
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      icon: Clock
    };
    return { 
      text: `${diffDays} days left to apply`, 
      color: 'text-green-600 bg-green-50 border-green-200',
      icon: CheckCircle
    };
  };

  const formatEmploymentType = (type) => {
    const typeMap = {
      'full-time': 'Full-time',
      'part-time': 'Part-time',
      'contract': 'Contract',
      'remote': 'Remote'
    };
    return typeMap[type] || type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatExperienceLevel = (level) => {
    const levelMap = {
      'no-experience': 'No Experience (Fresher)',
      'entry': 'Entry Level',
      'mid': 'Mid Level',
      'senior': 'Senior Level',
      'expert': 'Expert Level'
    };
    return levelMap[level] || level.charAt(0).toUpperCase() + level.slice(1);
  };

  const getJobStatus = () => {
    if (job.status === 'active') return { text: 'Actively hiring', color: 'text-green-600 bg-green-50', icon: CheckCircle };
    if (job.status === 'draft') return { text: 'Draft', color: 'text-gray-600 bg-gray-50', icon: FileText };
    if (job.status === 'closed') return { text: 'Position filled', color: 'text-red-600 bg-red-50', icon: AlertCircle };
    if (job.status === 'archived') return { text: 'Archived', color: 'text-gray-600 bg-gray-50', icon: FileText };
    return { text: 'Available', color: 'text-blue-600 bg-blue-50', icon: CheckCircle };
  };

  const salaryInfo = getSalaryDisplay();
  const deadlineStatus = getDeadlineStatus();
  const jobStatus = getJobStatus();
  const isJobClosed = job.status === 'closed';
  const applicationDetailId =
    applicationStatus?.application?.applicationId ||
    applicationStatus?.applicationId ||
    applicationStatus?.application?._id;

  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200 group"
      whileHover={{ y: -2 }}
    >
      <div className="p-6">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1 leading-tight">
                  {job.title}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Building2 className="w-4 h-4" />
                  <span className="font-medium">{job.company || job.employer?.companyName || job.employer?.name || 'Company Name'}</span>
                  <span>•</span>
                  <MapPin className="w-4 h-4" />
                  <span>{job.location}</span>
                </div>
              </div>
              <motion.button
                onClick={handleBookmark}
                className={`p-2 rounded-lg transition-colors ${
                  isBookmarked 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Key Information */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatEmploymentType(job.employmentType)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{formatExperienceLevel(job.experienceLevel)}</span>
          </div>
          <div className="flex items-center gap-1">
            {salaryInfo.symbol && (
              <span className="w-4 h-4 inline-flex items-center justify-center text-xs font-semibold">
                {salaryInfo.symbol}
              </span>
            )}
            <span className="font-medium text-gray-900">{salaryInfo.display}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>{getTimeAgo(job.publishedAt || job.createdAt)}</span>
          </div>
        </div>

        {/* Job Description Preview */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {job.description}
          </p>
        </div>

        {/* Required Skills Preview */}
        {job.skills && job.skills.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {job.skills.slice(0, 4).map((skill, skillIndex) => (
                <span
                  key={skillIndex}
                  className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-medium"
                >
                  {skill}
                </span>
              ))}
              {job.skills.length > 4 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded font-medium">
                  +{job.skills.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Application Status & Deadline */}
        <div className="flex items-center justify-between mb-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{viewCount} views</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{job.applicationsCount || job.metadata?.applicants || 0} applicants</span>
            </div>
          </div>
          {job.applicationDeadline && (
            <div className="text-right">
              <div className="text-xs text-gray-500">Apply by</div>
              <div className="text-sm font-medium text-gray-900">
                {new Date(job.applicationDeadline).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>
          )}
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-slate-200 pt-6 mb-6"
            >
              <div className="space-y-6">
                {/* Complete Job Description */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Job Description</h4>
                  <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                    <p className="whitespace-pre-line leading-relaxed">{job.description}</p>
                  </div>
                </div>

                {/* Detailed Salary Information */}
                {salaryInfo.range && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Compensation</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Base Salary:</span>
                          <span className="font-semibold text-gray-900">{salaryInfo.range}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Education Requirements */}
                {job.educationRequirements && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Education Requirements</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700">{job.educationRequirements}</p>
                    </div>
                  </div>
                )}

                {/* Complete Skills Requirements */}
                {job.skills && job.skills.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Required Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((skill, skillIndex) => (
                        <span
                          key={skillIndex}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded font-medium"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Application Deadline */}
                {job.applicationDeadline && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Application Deadline</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {new Date(job.applicationDeadline).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Applications reviewed on a rolling basis
                        </div>
                      </div>
                    </div>
                  </div>
                )}


              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <motion.button
            onClick={handleViewDetails}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {isExpanded ? 'Less' : 'Details'}
          </motion.button>
          <motion.button
            onClick={async () => {
              if (applicationStatus?.hasApplied) {
                if (applicationDetailId) {
                  navigate(`/candidate/applications/${applicationDetailId}`);
                } else {
                  navigate('/candidate/applications');
                }
              } else if (!isJobClosed && completion && isComplete && completion.percentage === 100) {
                await handleApplyNow();
              }
            }}
            disabled={(isJobClosed || !completion || !isComplete || completion.percentage < 100) && !applicationStatus?.hasApplied}
            className={`flex-1 px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2 ${
              applicationStatus?.hasApplied
                ? 'bg-green-600 text-white cursor-pointer'
                : isJobClosed
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : completion && isComplete && completion.percentage === 100
                ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            whileHover={
              applicationStatus?.hasApplied || (!isJobClosed && completion && isComplete && completion.percentage === 100) 
                ? { scale: 1.02 } 
                : {}
            }
            whileTap={
              applicationStatus?.hasApplied || (!isJobClosed && completion && isComplete && completion.percentage === 100) 
                ? { scale: 0.98 } 
                : {}
            }
          >
            {applicationStatus?.hasApplied ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Applied
              </>
            ) : isJobClosed ? (
              <>
                <AlertCircle className="w-4 h-4" />
                Closed
              </>
            ) : completion && isComplete && completion.percentage === 100 ? (
              <>
                Apply Now
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Complete Profile
              </>
            )}
          </motion.button>
        </div>
      </div>


    </motion.div>
  );
};

export default JobCard;