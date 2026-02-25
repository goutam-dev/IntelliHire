// frontend/src/pages/candidate/Profile.jsx
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchCandidateProfile, 
  updateBasicInfo,
  uploadResume,
  addEducation,
  addExperience,
  updateSkills,
  deleteEducation,
  deleteExperience,
  deleteResume,
  uploadVideo,
  deleteVideo,
  clearError
} from '../../store/slices/candidateSlice';

import PersonalInfoSection from '../../components/candidate/profile/PersonalInfoSection';
import ResumeSection from '../../components/candidate/profile/ResumeSection';
import EducationSection from '../../components/candidate/profile/EducationSection';
import ExperienceSection from '../../components/candidate/profile/ExperienceSection';
import SkillsSection from '../../components/candidate/profile/SkillsSection';
import SummarySection from '../../components/candidate/profile/SummarySection';
import AccountSettingsSection from '../../components/candidate/profile/AccountSettingsSection';
import VideoSection from '../../components/candidate/profile/VideoSection';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';

const Profile = () => {
  const dispatch = useDispatch();
  const { profile, loading, error } = useSelector(state => state.candidate);
  const [activeSection, setActiveSection] = useState('personal');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    dispatch(fetchCandidateProfile());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error.message || error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleSectionChange = (section) => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave this section?')) {
        setHasUnsavedChanges(false);
        setActiveSection(section);
      }
    } else {
      setActiveSection(section);
    }
  };

  const sections = [
    { id: 'personal', label: 'Personal Info', icon: '👤' },
    { id: 'resume', label: 'Resume', icon: '📄' },
    { id: 'video', label: 'Video Intro', icon: '🎥' },
    { id: 'education', label: 'Education', icon: '🎓' },
    { id: 'experience', label: 'Experience', icon: '💼' },
    { id: 'skills', label: 'Skills', icon: '⚡' },
    { id: 'summary', label: 'Summary', icon: '📝' },
    { id: 'settings', label: 'Account Settings', icon: '⚙️' }
  ];

  if (loading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600 mt-2">
            Manage your professional profile and account settings
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <nav className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => handleSectionChange(section.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-3 text-lg">{section.icon}</span>
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Profile Completion Card */}
            {profile?.profileCompletion && (
              <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Profile Completion
                </h3>
                <div className="mb-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium text-gray-900">
                      {profile.profileCompletion.percentage}%
                    </span>
                  </div>
                  <div className="mt-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${profile.profileCompletion.percentage}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Complete your profile to increase visibility to employers
                </p>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {activeSection === 'personal' && (
                <div>
                  <PersonalInfoSection 
                    profile={profile}
                    onUpdate={(data) => dispatch(updateBasicInfo(data))}
                    onUnsavedChanges={setHasUnsavedChanges}
                  />
                </div>
              )}

              {activeSection === 'resume' && (
                <ResumeSection 
                  profile={profile}
                  onUpload={(formData) => dispatch(uploadResume(formData))}
                  onDelete={() => dispatch(deleteResume())}
                />
              )}

              {activeSection === 'video' && (
                <VideoSection
                  profile={profile}
                  onUpload={(formData) => dispatch(uploadVideo(formData))}
                  onDelete={() => dispatch(deleteVideo())}
                />
              )}

              {activeSection === 'education' && (
                <EducationSection 
                  profile={profile}
                  onAdd={(education) => dispatch(addEducation(education))}
                  onDelete={(id) => dispatch(deleteEducation(id))}
                />
              )}

              {activeSection === 'experience' && (
                <ExperienceSection 
                  profile={profile}
                  onAdd={(experience) => dispatch(addExperience(experience))}
                  onDelete={(id) => dispatch(deleteExperience(id))}
                />
              )}

              {activeSection === 'skills' && (
                <SkillsSection 
                  profile={profile}
                  onUpdate={(skills) => dispatch(updateSkills(skills))}
                  onUnsavedChanges={setHasUnsavedChanges}
                />
              )}

              {activeSection === 'summary' && (
                <SummarySection 
                  profile={profile}
                  onUpdate={(data) => dispatch(updateBasicInfo(data))}
                  onUnsavedChanges={setHasUnsavedChanges}
                />
              )}

              {activeSection === 'settings' && (
                <AccountSettingsSection 
                  profile={profile}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;