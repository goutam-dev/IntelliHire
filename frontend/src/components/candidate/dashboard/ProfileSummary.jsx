// frontend/src/components/candidate/dashboard/ProfileSummary.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
  Clock
} from 'lucide-react';

const ProfileSummary = ({ onModalOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { profile } = useSelector((state) => state.candidate);
  const [activeTab, setActiveTab] = useState('overview');

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
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = resume.fileUrl;
      link.download = resume.fileName || 'resume.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Show a message if no resume is available
      alert('No resume available to download. Please upload a resume first.');
    }
  };

  // Handle stats refresh (for debugging the application count issue)
  const handleRefreshStats = async () => {
    try {
      await api.post('/job-applications/recalculate-stats');
      // Refresh the profile data
      dispatch(fetchCandidateProfile());
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const renderOverview = () => (
    <div className="space-y-4">
      {/* Profile Header */}
      <div className="flex items-start gap-4">
        <div className="relative">
          {profilePhotoUrl ? (
            <img 
              src={`http://localhost:4000${profilePhotoUrl}`}
              alt="Profile" 
              className="h-16 w-16 rounded-full object-cover border-2 border-slate-200"
              onError={(e) => {
                // Fallback to avatar if image fails to load
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className={`h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xl ${profilePhotoUrl ? 'hidden' : ''}`}
          >
            {user?.fullName ? 
              user.fullName.split(' ').map(name => name[0]).join('').toUpperCase().slice(0, 2) : 
              'U'
            }
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900">
            {user?.fullName || 'User'}
          </h3>
          <p className="text-sm text-slate-600">{professionalTitle || headline || 'Job Seeker'}</p>
          
          {/* Contact Info */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
            {location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {location}
              </div>
            )}
            {user?.email && (
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {user.email}
              </div>
            )}
            {phoneNumber && (
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {phoneNumber}
              </div>
            )}
          </div>

          {/* External Links */}
          {(linkedinUrl || portfolioUrl) && (
            <div className="flex items-center gap-3 mt-2">
              {linkedinUrl && (
                <a 
                  href={linkedinUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  LinkedIn
                </a>
              )}
              {portfolioUrl && (
                <a 
                  href={portfolioUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Portfolio
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-medium text-slate-600">Experience</span>
          </div>
          <p className="text-sm font-semibold text-slate-900 mt-1">
            {experience.length} position{experience.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-medium text-slate-600">Education</span>
          </div>
          <p className="text-sm font-semibold text-slate-900 mt-1">
            {education.length} degree{education.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Resume Status */}
      {resume?.fileUrl && (
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-700">Resume Uploaded</span>
            </div>
            <span className="text-xs text-green-600">
              {resume.fileName || 'resume.pdf'}
            </span>
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div>
          <h4 className="text-sm font-medium text-slate-900 mb-2">About</h4>
          <p className="text-xs text-slate-600 leading-relaxed">
            {summary.length > 150 ? `${summary.substring(0, 150)}...` : summary}
          </p>
        </div>
      )}

      {/* Skills Preview */}
      {skills && skills.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-900 mb-2">Skills ({skills.length})</h4>
          <div className="flex flex-wrap gap-1">
            {skills.slice(0, 8).map((skill, index) => (
              <span 
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {skill}
              </span>
            ))}
            {skills.length > 8 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                +{skills.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
        <motion.button
          onClick={handleEditProfile}
          className="flex items-center justify-center gap-1 p-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Pencil className="h-3 w-3" />
          Edit Profile
        </motion.button>
        <motion.button
          onClick={handleDownloadResume}
          disabled={!resume?.fileUrl}
          className={`flex items-center justify-center gap-1 p-2 text-xs font-medium rounded-lg transition-colors ${
            resume?.fileUrl 
              ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' 
              : 'text-slate-400 cursor-not-allowed'
          }`}
          whileHover={resume?.fileUrl ? { scale: 1.02 } : {}}
          whileTap={resume?.fileUrl ? { scale: 0.98 } : {}}
        >
          <Download className="h-3 w-3" />
          Download Resume
        </motion.button>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-4">
      {/* Application Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-600">Job Applications</span>
            </div>
            {totalApplications === 0 && (
              <button
                onClick={handleRefreshStats}
                className="text-xs text-blue-500 hover:text-blue-700 underline"
                title="Click to refresh application count"
              >
                Refresh
              </button>
            )}
          </div>
          <p className="text-lg font-bold text-blue-900 mt-1">{totalApplications}</p>
          <p className="text-xs text-blue-600">Jobs applied to</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-600">Skills</span>
          </div>
          <p className="text-lg font-bold text-purple-900 mt-1">{skills.length}</p>
          <p className="text-xs text-purple-600">Added to profile</p>
        </div>
      </div>

      {/* Profile Activity */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-green-600" />
            <span className="text-xs font-medium text-green-600">Profile Age</span>
          </div>
          <p className="text-lg font-bold text-green-900 mt-1">{profileAge}</p>
          <p className="text-xs text-green-600">Days active</p>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="text-xs font-medium text-orange-600">Last Update</span>
          </div>
          <p className="text-lg font-bold text-orange-900 mt-1">{lastUpdated}</p>
          <p className="text-xs text-orange-600">Days ago</p>
        </div>
      </div>

      {/* Profile Completeness */}
      <div className="bg-slate-50 rounded-lg p-3">
        <h4 className="text-sm font-medium text-slate-900 mb-2">Profile Completeness</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">Basic Info</span>
            <span className="text-green-600 font-medium">✓ Complete</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">Resume</span>
            <span className={resume?.fileUrl ? "text-green-600 font-medium" : "text-slate-400"}>
              {resume?.fileUrl ? "✓ Uploaded" : "Not uploaded"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">Experience</span>
            <span className={experience.length > 0 ? "text-green-600 font-medium" : "text-slate-400"}>
              {experience.length > 0 ? `✓ ${experience.length} added` : "None added"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">Education</span>
            <span className={education.length > 0 ? "text-green-600 font-medium" : "text-slate-400"}>
              {education.length > 0 ? `✓ ${education.length} added` : "None added"}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">Skills</span>
            <span className={skills.length >= 3 ? "text-green-600 font-medium" : "text-amber-600"}>
              {skills.length >= 3 ? `✓ ${skills.length} skills` : `${skills.length}/3 minimum`}
            </span>
          </div>
        </div>
      </div>


    </div>
  );

  return (
    <motion.div 
      className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
    >
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' ? renderOverview() : renderAnalytics()}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ProfileSummary;