// frontend/src/components/candidate/dashboard/ProfileCompletion.jsx
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { fetchProfileCompletion } from '../../../store/slices/profileCompletionSlice';
import { ShieldAlert, CheckCircle2, ChevronRight } from 'lucide-react';

const ProfileCompletion = ({ onModalOpen }) => {
  const dispatch = useDispatch();
  const { completion, incompleteSections, isComplete, loading } = useSelector(
    (state) => state.profileCompletion
  );
  const { profile } = useSelector((state) => state.candidate);

  useEffect(() => {
    dispatch(fetchProfileCompletion());
  }, [dispatch]);

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
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-5 bg-zinc-200 rounded w-1/2"></div>
          <div className="h-2 bg-zinc-200 rounded w-full"></div>
          <div className="h-12 bg-zinc-100 rounded-xl"></div>
          <div className="h-12 bg-zinc-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-md"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-200/40 rounded-full blur-[50px] pointer-events-none" />
      
      <div className="relative z-10 flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-zinc-900 tracking-tight">Complete Your Profile</h2>
        <motion.span 
          className="text-xs font-bold text-zinc-800 bg-zinc-100 border border-zinc-200/80 py-1.5 px-3 rounded-full shadow-sm"
          key={completion.percentage}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
        >
          {completion.percentage}%
        </motion.span>
      </div>
      
      <div className="relative z-10 w-full bg-zinc-100/80 rounded-full h-1.5 mb-6 overflow-hidden border border-zinc-200/50">
        <motion.div 
          className="bg-gradient-to-r from-zinc-600 to-zinc-900 h-1.5 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${completion.percentage}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </div>

      {!isComplete ? (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">
            A complete profile stands out to top employers. Finish these steps:
          </p>
          <div className="grid gap-3">
            {incompleteSections.map((section, index) => (
              <motion.button 
                key={section.key}
                onClick={() => handleActionClick(section.key)}
                className="w-full group flex items-start gap-3 p-3 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition-all text-left"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="mt-0.5 text-zinc-400 group-hover:text-zinc-600">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-zinc-900 text-sm">{section.title}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{section.description}</p>
                </div>
                <div className="mt-1 text-zinc-300 group-hover:text-zinc-900 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      ) : (
        <motion.div 
          className="flex flex-col items-center justify-center py-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6 text-zinc-900" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 mb-1">You're All Set</h3>
          <p className="text-sm text-zinc-500">
            Your profile looks great and is ready for recruiters.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ProfileCompletion;