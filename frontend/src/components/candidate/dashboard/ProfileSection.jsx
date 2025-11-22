// frontend/src/components/candidate/dashboard/ProfileSection.jsx
import React from 'react';
import { useSelector } from 'react-redux';
import ProfileCompletion from './ProfileCompletion';
import ProfileSummary from './ProfileSummary';

const ProfileSection = ({ onModalOpen }) => {
  const { isComplete } = useSelector((state) => state.profileCompletion);
  const { profile } = useSelector((state) => state.candidate);

  // Show ProfileSummary if profile is complete, otherwise show ProfileCompletion
  if (isComplete && profile) {
    return <ProfileSummary onModalOpen={onModalOpen} />;
  }

  return <ProfileCompletion onModalOpen={onModalOpen} />;
};

export default ProfileSection;