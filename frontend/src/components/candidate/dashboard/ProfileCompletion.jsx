// frontend/src/components/candidate/dashboard/ProfileCompletion.jsx
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProfileCompletion } from '../../../store/slices/profileCompletionSlice';

const ProfileCompletion = ({ onModalOpen }) => {
  const dispatch = useDispatch();
  const { completion, incompleteSections, isComplete, loading } = useSelector(
    (state) => state.profileCompletion
  );
  const { profile } = useSelector((state) => state.candidate);

  useEffect(() => {
    dispatch(fetchProfileCompletion());
  }, [dispatch]);

  // Refresh completion when profile changes
  useEffect(() => {
    if (profile) {
      dispatch(fetchProfileCompletion());
    }
  }, [dispatch, profile?.profileCompletion?.percentage]);

  const handleActionClick = (sectionKey) => {
    if (onModalOpen) {
      onModalOpen(sectionKey);
    }
  };

  if (loading) {
    return (
      <motion.div 
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        whileHover={{ y: -2 }}
        transition={{ duration: 0.3 }}
      >
        <div className="animate-pulse">
          <div className="h-5 bg-slate-200 rounded w-1/2 mb-3"></div>
          <div className="h-2 bg-slate-200 rounded mb-4"></div>
          <div className="space-y-2">
            <div className="h-12 bg-slate-200 rounded-xl"></div>
            <div className="h-12 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-slate-900">Profile Completion</h2>
        <motion.span 
          className="text-sm font-medium text-slate-600"
          key={completion.percentage}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
        >
          {completion.percentage}%
        </motion.span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-slate-200 rounded-full h-2 mb-4 overflow-hidden">
        <motion.div 
          className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${completion.percentage}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
        />
      </div>

      {!isComplete ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            {completion.percentage === 20 
              ? "Complete these sections to boost your profile:"
              : `You're ${completion.percentage}% there! Complete these sections:`}
          </p>
          <div className="grid gap-2">
            {incompleteSections.map((section, index) => (
              <motion.div 
                key={section.key}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <div>
                  <h3 className="font-medium text-slate-900 text-sm">{section.title}</h3>
                  <p className="text-xs text-slate-600">{section.description}</p>
                </div>
                <motion.button
                  onClick={() => handleActionClick(section.key)}
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Complete →
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <motion.div 
          className="text-center py-3"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-800">
            <motion.span 
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            🎉 Profile Complete!
          </div>
        </motion.div>
      )}

    </motion.div>
  );
};

export default ProfileCompletion;