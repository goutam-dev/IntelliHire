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
    if (!profile && !loading && !error) {
      dispatch(fetchCandidateProfile());
    }
  }, [dispatch, profile, loading, error]);

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
    <div className="min-h-screen bg-zinc-50/50 pb-12">
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">My Profile</h1>
              <p className="text-zinc-500 mt-1.5 text-sm sm:text-base font-medium">
                Manage your professional profile and account settings
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4">
              <nav className="space-y-1.5">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => handleSectionChange(section.id)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-bold rounded-xl transition-all ${
                      activeSection === section.id
                        ? 'bg-zinc-900 text-white shadow-sm'
                        : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
                    }`}
                  >
                    <span className="mr-3 text-lg opacity-80">{section.icon}</span>
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Profile Completion Card */}
            {profile?.profileCompletion && (
              <div className="mt-6 bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
                <h3 className="text-sm font-bold text-zinc-900 mb-4 tracking-wide uppercase">
                  Profile Completion
                </h3>
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-zinc-500 font-bold">Progress</span>
                    <span className="font-extrabold text-zinc-900">
                      {profile.profileCompletion.percentage}%
                    </span>
                  </div>
                  <div className="bg-zinc-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-zinc-900 h-full rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${profile.profileCompletion.percentage}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs font-medium text-zinc-500 leading-relaxed">
                  Complete your profile to increase visibility to employers
                </p>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
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
                  onAdd={(experience) => dispatch(addExperience(experience)).unwrap()}
                  onDelete={(id) => dispatch(deleteExperience(id)).unwrap()}
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