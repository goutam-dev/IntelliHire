// frontend/src/components/candidate/dashboard/WelcomeSection.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
// import { setActiveSection } from '../../../store/slices/uiSlice';

const WelcomeSection = () => {
  const dispatch = useDispatch();
  const profile = useSelector(state => state.candidate.profile);
  
  // Safe data extraction with fallbacks
  const user = profile?.user || {};
  const fullName = user?.fullName || 'Candidate';
  const profileCompletion = profile?.profileCompletion?.percentage || 0;

  // Browse Jobs button removed - navigation now handled by header and quick actions

  // Get appropriate message based on completion
  const getWelcomeMessage = () => {
    if (profileCompletion < 50) {
      return "Complete your profile to unlock better job opportunities.";
    } else if (profileCompletion < 100) {
      return "You're making great progress! Keep completing your profile.";
    } else {
      return "Your profile is complete! Start applying to amazing jobs.";
    }
  };

  return (
    <motion.div 
      className="text-left"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <motion.h1 
        className="text-2xl font-semibold text-slate-900"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Welcome back, {fullName}!
      </motion.h1>
      <motion.p 
        className="text-slate-600 mt-1 text-sm"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {getWelcomeMessage()}
      </motion.p>
    </motion.div>
  );
};

export default WelcomeSection;