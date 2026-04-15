// frontend/src/components/candidate/dashboard/ProfileSummary.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchCandidateProfile } from '../../../store/slices/candidateSlice';
import api from '../../../lib/api';
import { 
  User, 
  Mail, 
  MapPin, 
  Briefcase,
  GraduationCap,
  Download,
  Pencil,
  BarChart3,
  ExternalLink,
  Phone,
  FileText,
  Calendar,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2,
  Circle,
  RefreshCw
} from 'lucide-react';

const SummaryItem = ({ icon: Icon, label, value }) => (
  <div className="flex flex-col p-4 border border-zinc-200/60 rounded-xl bg-zinc-50/50">
    <div className="flex items-center gap-2 mb-2 text-zinc-500">
      <Icon className="w-4 h-4" />
      <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
    </div>
    <span className="text-lg font-semibold text-zinc-900 tracking-tight">{value}</span>
  </div>
);

const CompletenessItem = ({ label, isComplete, meta }) => (
  <div className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
    <div className="flex items-center gap-2">
      {isComplete ? (
        <CheckCircle2 className="w-4 h-4 text-zinc-900" />
      ) : (
        <Circle className="w-4 h-4 text-zinc-300" />
      )}
      <span className="text-sm font-medium text-zinc-700">{label}</span>
    </div>
    <span className="text-xs text-zinc-500">{meta}</span>
  </div>
);

const ProfileSummary = ({ onModalOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { profile } = useSelector((state) => state.candidate);
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!profile) return null;

  // Extract real profile data
  const {
    user,
    phoneNumber,
    location,
    professionalTitle,
    headline,
    summary,
    linkedinUrl,
    portfolioUrl,
    resume,
    education = [],
    experience = [],
    skills = [],
    profilePhotoUrl,
    stats = {},
    createdAt,
    lastProfileUpdateAt
  } = profile;

  // Calculate profile metrics
  const totalApplications = stats.totalApplications || 0;
  const profileAge = createdAt ? Math.floor((new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24)) : 0;
  const lastUpdated = lastProfileUpdateAt ? Math.floor((new Date() - new Date(lastProfileUpdateAt)) / (1000 * 60 * 60 * 24)) : 0;

  // Handle edit profile navigation
  const handleEditProfile = () => {
    navigate('/candidate/profile');
  };

  // Handle resume download
  const handleDownloadResume = () => {
    if (resume?.fileUrl) {
      const link = document.createElement('a');
      link.href = resume.fileUrl;
      link.download = resume.fileName || 'resume.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert('No resume available to download. Please upload a resume first.');
    }
  };

  // Handle stats refresh
  const handleRefreshStats = async () => {
    setIsRefreshing(true);
    try {
      await api.post('/job-applications/recalculate-stats');
      dispatch(fetchCandidateProfile());
    } catch (error) {
      console.error('Error refreshing stats:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'analytics', label: 'Analytics' },
  ];

  const renderOverview = () => (
    <motion.div 
      key="overview"
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Header Profile */}
      <div className="flex items-start gap-5 relative overflow-hidden rounded-2xl p-5 border border-zinc-100/80 bg-gradient-to-br from-zinc-100/80 via-zinc-50/50 to-white shadow-sm">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-zinc-300/80 to-zinc-200/50" />
        <div className="relative shrink-0">
          {profilePhotoUrl ? (
            <img 
              src={`http://localhost:4000${profilePhotoUrl}`}
              alt="Profile" 
              className="h-16 w-16 rounded-full object-cover shadow-sm ring-1 ring-zinc-200"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className={`h-16 w-16 rounded-full bg-zinc-900 flex items-center justify-center text-white font-medium text-lg tracking-tight ${profilePhotoUrl ? 'hidden' : ''}`}
          >
            {user?.fullName ? 
              user.fullName.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2) : 
              'U'
            }
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-zinc-900 tracking-tight truncate">
            {user?.fullName || 'User'}
          </h2>
          <p className="text-sm text-zinc-500 font-medium truncate mt-0.5">
            {professionalTitle || headline || 'Job Seeker'}
          </p>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-zinc-500 font-medium">
            {location && (
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{location}</span>
            )}
            {user?.email && (
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{user.email}</span>
            )}
            {phoneNumber && (
              <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{phoneNumber}</span>
            )}
          </div>
        </div>
      </div>

      {/* External Links */}
      {(linkedinUrl || portfolioUrl) && (
        <div className="flex items-center gap-4 text-xs font-medium">
          {linkedinUrl && (
            <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-zinc-900 hover:text-zinc-600 transition-colors">
              <ExternalLink className="h-3.5 w-3.5" /> LinkedIn
            </a>
          )}
          {portfolioUrl && (
            <a href={portfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-zinc-900 hover:text-zinc-600 transition-colors">
              <ExternalLink className="h-3.5 w-3.5" /> Portfolio
            </a>
          )}
        </div>
      )}

      {/* About */}
      {summary && (
        <div className="pt-4 border-t border-zinc-100">
          <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-widest mb-2">About</h3>
          <p className="text-sm text-zinc-600 leading-relaxed font-medium">
            {summary.length > 200 ? `${summary.substring(0, 200)}...` : summary}
          </p>
        </div>
      )}

      {/* Skills */}
      {skills && skills.length > 0 && (
        <div className="pt-4 border-t border-zinc-100">
          <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-widest mb-3">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {skills.slice(0, 8).map((skill, index) => (
              <span key={index} className="px-2.5 py-1 rounded-md bg-zinc-100/80 text-zinc-800 border border-zinc-200/60 text-xs font-medium tracking-tight">
                {skill}
              </span>
            ))}
            {skills.length > 8 && (
              <span className="px-2.5 py-1 rounded-md bg-white border border-dashed border-zinc-300 text-zinc-500 text-xs font-medium tracking-tight">
                +{skills.length - 8}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Resume Document */}
      {resume?.fileUrl && (
        <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-100/80">
                <FileText className="w-4 h-4 text-zinc-900" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900 tracking-tight">Resume</p>
                <p className="text-xs text-zinc-500 font-medium truncate max-w-[150px]">{resume.fileName || 'resume.pdf'}</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDownloadResume}
              className="px-3 py-1.5 rounded-md hover:bg-zinc-100 text-zinc-900 flex items-center gap-2 text-xs font-semibold transition-colors border border-transparent hover:border-zinc-200"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </motion.button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-4 border-t border-zinc-100 grid grid-cols-2 gap-3">
        <motion.button
          onClick={handleEditProfile}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-medium tracking-tight shadow-sm hover:bg-zinc-800 transition-colors"
        >
          <Pencil className="w-4 h-4" /> Edit Profile
        </motion.button>
        <motion.button
          onClick={handleDownloadResume}
          disabled={!resume?.fileUrl}
          whileHover={resume?.fileUrl ? { scale: 1.01 } : {}}
          whileTap={resume?.fileUrl ? { scale: 0.99 } : {}}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium tracking-tight transition-colors border ${
            resume?.fileUrl 
              ? 'bg-white border-zinc-200 text-zinc-900 shadow-sm hover:bg-zinc-50' 
              : 'bg-zinc-50 border-zinc-200/50 text-zinc-400 cursor-not-allowed'
          }`}
        >
          <Download className="w-4 h-4" /> Resume
        </motion.button>
      </div>
    </motion.div>
  );

  const renderAnalytics = () => (
    <motion.div 
      key="analytics"
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-widest">Metrics</h3>
        <button 
          onClick={handleRefreshStats} 
          disabled={isRefreshing}
          className="p-1.5 rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="text-xs font-medium uppercase tracking-wider">Sync</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SummaryItem icon={TrendingUp} label="Applications" value={totalApplications} />
        <SummaryItem icon={Award} label="Skills" value={skills?.length || 0} />
        <SummaryItem icon={Briefcase} label="Experience" value={experience?.length || 0} />
        <SummaryItem icon={GraduationCap} label="Education" value={education?.length || 0} />
      </div>

      <div className="pt-4 border-t border-zinc-100">
        <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-widest mb-4">Profile Completeness</h3>
        <div className="flex flex-col">
          <CompletenessItem label="Basic Info" isComplete={true} meta="Complete" />
          <CompletenessItem label="Resume" isComplete={!!resume?.fileUrl} meta={resume?.fileUrl ? "Uploaded" : "Missing"} />
          <CompletenessItem label="Experience" isComplete={experience?.length > 0} meta={experience?.length ? `${experience.length} Added` : "None"} />
          <CompletenessItem label="Education" isComplete={education?.length > 0} meta={education?.length ? `${education.length} Added` : "None"} />
          <CompletenessItem label="Skills" isComplete={skills?.length >= 3} meta={skills?.length >= 3 ? `${skills.length} Added` : "Needs 3+"} />
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-100 grid grid-cols-2 gap-3">
        <div className="flex flex-col p-4 bg-zinc-50/50 rounded-xl border border-zinc-200/60">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Profile Age</span>
          <span className="text-sm font-semibold text-zinc-900">{profileAge} days</span>
        </div>
        <div className="flex flex-col p-4 bg-zinc-50/50 rounded-xl border border-zinc-200/60">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Last Updated</span>
          <span className="text-sm font-semibold text-zinc-900">{lastUpdated === 0 ? 'Today' : `${lastUpdated} days ago`}</span>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="bg-white rounded-2xl border-[0.5px] border-zinc-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
      {/* Tabs Navigation */}
      <div className="flex px-4 pt-2 border-b border-zinc-100">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="relative pb-3 pt-2 px-4 text-sm font-medium tracking-tight outline-none transition-colors"
          >
            <span className={activeTab === tab.id ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}>
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTabBadge"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-900 rounded-t-full"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-5 sm:p-6 min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' ? renderOverview() : renderAnalytics()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProfileSummary;