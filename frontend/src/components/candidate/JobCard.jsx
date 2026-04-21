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
  ArrowRight,
  DollarSign
} from 'lucide-react';
import { getCurrencySymbol } from '../../constants/jobConstants';
import jobApi from '../../services/api/jobApi';
import { resolveUploadUrl } from '../../utils/mediaUrl';
import { isApplicationDeadlinePassed } from '../../utils/jobAvailability';

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
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  // Get profile completion data from Redux store
  const { completion, incompleteSections, isComplete } = useSelector(state => state.profileCompletion);
  
  // Get application status from Redux store
  const { applicationStatuses } = useSelector(state => state.jobApplications);
  const applicationStatus = applicationStatuses[job._id];

  useEffect(() => {
    setViewCount(job.viewsCount || job.metadata?.views || 0);
  }, [job._id, job.viewsCount, job.metadata?.views]);

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [job?.companyLogoUrl]);

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
  const isDeadlinePassed = isApplicationDeadlinePassed(job.applicationDeadline);
  const isApplyBlocked = isJobClosed || isDeadlinePassed;
  const companyName = job.company || job.employer?.companyName || job.employer?.name || 'Company Name';
  const companyInitial = (companyName[0] || 'C').toUpperCase();
  const companyLogoUrl = resolveUploadUrl(job.companyLogoUrl || job.employer?.logoUrl || null);
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
      className="relative bg-white rounded-2xl border border-zinc-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-zinc-300 transition-all duration-300 group overflow-hidden"
    >
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-800 to-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="p-6 sm:p-8">
        {/* Header Section */}
        <div className="flex items-start gap-5 mb-6">
          {/* Company Initial/Logo Placeholder */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-zinc-900/20 font-bold text-xl uppercase tracking-wider overflow-hidden">
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
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 mb-1.5 leading-tight tracking-tight group-hover:text-zinc-700 transition-colors truncate">
                  {job.title}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
                  <div className="flex items-center gap-1.5 text-zinc-700">
                    <Building2 className="w-4 h-4 text-zinc-400" />
                    <span>{companyName}</span>
                  </div>
                  <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                  <div className="flex items-center gap-1.5 text-zinc-600">
                    <MapPin className="w-4 h-4 text-zinc-400" />
                    <span>{job.location}</span>
                  </div>
                </div>
              </div>
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBookmark();
                }}
                className={`p-2.5 rounded-xl transition-all border ${
                  isBookmarked 
                    ? 'text-indigo-600 bg-indigo-50 border-indigo-200 shadow-sm' 
                    : 'text-zinc-400 border-transparent hover:text-zinc-600 hover:bg-zinc-100'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Badges / Key Information */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-semibold tracking-wide border border-zinc-200/50">
            <Clock className="w-3.5 h-3.5 opacity-70" />
            {formatEmploymentType(job.employmentType)}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 text-zinc-700 rounded-lg text-xs font-semibold tracking-wide border border-zinc-200/50">
            <Users className="w-3.5 h-3.5 opacity-70" />
            {formatExperienceLevel(job.experienceLevel)}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold tracking-wide border border-emerald-200/50">
            <DollarSign className="w-3.5 h-3.5 opacity-70" />
            {salaryInfo.display}
          </span>
        </div>

        {/* Job Description Preview */}
        <div className="mb-6 overflow-hidden">
          <p className="text-sm text-zinc-600 line-clamp-2 leading-relaxed break-words overflow-wrap-anywhere">
            {job.description}
          </p>
        </div>

        {/* Required Skills Preview */}
        {job.skills && job.skills.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {job.skills.slice(0, 5).map((skill, skillIndex) => (
                <span
                  key={skillIndex}
                  className="px-2.5 py-1 bg-white border border-zinc-200 text-zinc-600 text-xs rounded-md font-medium shadow-sm"
                >
                  {skill}
                </span>
              ))}
              {job.skills.length > 5 && (
                <span className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 text-zinc-500 text-xs rounded-md font-medium">
                  +{job.skills.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Application Status & Deadline */}
        <div className="flex items-center justify-between py-4 border-t border-zinc-100 mt-2 mb-2">
          <div className="flex flex-col sm:flex-row gap-0 sm:gap-6 text-sm text-zinc-500 font-medium">
            <div className="flex items-center gap-2 mb-1 sm:mb-0">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <span>{getTimeAgo(job.publishedAt || job.createdAt)}</span>
            </div>
          </div>
          
          {job.applicationDeadline && (
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-200/50">
              <CalendarDays className="w-4 h-4 text-zinc-400" />
              {new Date(job.applicationDeadline).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
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
              className="border-t border-zinc-100 pt-6 mb-6 overflow-hidden"
            >
              <div className="space-y-6">
                {/* Complete Job Description */}
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 mb-3 tracking-tight uppercase flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-400" />
                    Job Description
                  </h4>
                  <div className="text-sm text-zinc-700 bg-zinc-50/50 border border-zinc-200/60 p-4 sm:p-5 rounded-xl text-left overflow-hidden">
                    <p className="whitespace-pre-line leading-relaxed break-words break-all sm:break-words overflow-wrap-anywhere">{job.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Detailed Salary */}
                  {salaryInfo.range && (
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 mb-3 tracking-tight uppercase flex items-center gap-2">
                         <DollarSign className="w-4 h-4 text-zinc-400" />
                         Compensation
                      </h4>
                      <div className="bg-zinc-50/50 border border-zinc-200/60 p-4 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-600 font-medium">Base Salary</span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md text-sm border border-emerald-200/50">
                            {salaryInfo.range}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {job.educationRequirements && (
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 mb-3 tracking-tight uppercase flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-zinc-400" />
                        Education
                      </h4>
                      <div className="bg-zinc-50/50 border border-zinc-200/60 p-4 rounded-xl">
                        <p className="text-sm text-zinc-700 font-medium">{job.educationRequirements}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4 pt-4 border-t border-zinc-100">
          <motion.button
            onClick={handleViewDetails}
            className="px-5 py-3 border border-zinc-200 text-zinc-700 bg-white rounded-xl hover:bg-zinc-50 transition-colors text-sm font-bold flex items-center justify-center shadow-sm min-w-[120px]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isExpanded ? 'Show Less' : 'View Details'}
          </motion.button>
          
          <motion.button
            onClick={async () => {
              if (applicationStatus?.hasApplied) {
                if (applicationDetailId) {
                  navigate(`/candidate/applications/${applicationDetailId}`);
                } else {
                  navigate('/candidate/applications');
                }
              } else if (!isApplyBlocked && completion && isComplete && completion.percentage === 100) {
                await handleApplyNow();
              }
            }}
            disabled={(isApplyBlocked || !completion || !isComplete || completion.percentage < 100) && !applicationStatus?.hasApplied}
            className={`flex-1 px-5 py-3 rounded-xl transition-all text-sm font-bold flex items-center justify-center gap-2 shadow-sm ${
              applicationStatus?.hasApplied
                ? 'bg-zinc-900 text-white shadow-zinc-900/20 cursor-pointer'
                : isApplyBlocked
                ? 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed'
                : completion && isComplete && completion.percentage === 100
                ? 'bg-zinc-900 text-white hover:bg-zinc-800 hover:shadow-lg hover:shadow-zinc-900/20 cursor-pointer border border-zinc-900'
                : 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed'
            }`}
            whileHover={
              applicationStatus?.hasApplied || (!isApplyBlocked && completion && isComplete && completion.percentage === 100) 
                ? { scale: 1.02 } 
                : {}
            }
            whileTap={
              applicationStatus?.hasApplied || (!isApplyBlocked && completion && isComplete && completion.percentage === 100) 
                ? { scale: 0.98 } 
                : {}
            }
          >
            {applicationStatus?.hasApplied ? (
              <>
                <CheckCircle className="w-5 h-5" />
                View Application
              </>
            ) : isJobClosed ? (
              <>
                <AlertCircle className="w-5 h-5" />
                Position Closed
              </>
            ) : isDeadlinePassed ? (
              <>
                <AlertCircle className="w-5 h-5" />
                Deadline Passed
              </>
            ) : completion && isComplete && completion.percentage === 100 ? (
              <>
                Apply Now
                <ArrowRight className="w-5 h-5" />
              </>
            ) : (
              <>
                Complete Profile to Apply
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default JobCard;