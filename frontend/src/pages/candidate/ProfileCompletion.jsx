import React from 'react';
import { motion } from 'framer-motion';

const ProfileCompletion = ({ profileCompletion }) => {
  // Dynamic incomplete sections based on completion percentage
  const getIncompleteSections = (completion) => {
    const sections = [
      { 
        title: 'Upload Resume', 
        description: 'Employers want to see your experience', 
        completed: completion >= 20,
        action: 'upload-resume'
      },
      { 
        title: 'Add Skills', 
        description: 'Help employers find you', 
        completed: completion >= 40,
        action: 'add-skills'
      },
      { 
        title: 'Work Experience', 
        description: 'Showcase your professional background', 
        completed: completion >= 60,
        action: 'add-experience'
      },
      { 
        title: 'Education', 
        description: 'Add your educational background', 
        completed: completion >= 80,
        action: 'add-education'
      }
    ];
    
    return sections.filter(section => !section.completed);
  };

  const incompleteSections = getIncompleteSections(profileCompletion);

  return (
    <motion.div 
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-900">Profile Completion</h2>
        <motion.span 
          className="text-sm font-medium text-slate-600"
          key={profileCompletion}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
        >
          {profileCompletion}%
        </motion.span>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full bg-slate-200 rounded-full h-3 mb-6 overflow-hidden">
        <motion.div 
          className="bg-gradient-to-r from-emerald-500 to-green-500 h-3 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${profileCompletion}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
        />
      </div>

      {/* Dynamic Content Based on Completion */}
      {profileCompletion < 100 ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {profileCompletion === 20 
              ? "Great start! Complete these sections to boost your profile:"
              : `You're ${profileCompletion}% there! Complete these sections:`}
          </p>
          <div className="grid gap-3">
            {incompleteSections.map((section, index) => (
              <motion.div 
                key={section.title}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50/70 gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex-1">
                  <h3 className="font-medium text-slate-900 text-base sm:text-sm">{section.title}</h3>
                  <p className="text-slate-600 text-sm">{section.description}</p>
                </div>
                <motion.button
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Complete Now →
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <motion.div 
          className="text-center py-4"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-3 text-sm font-medium text-emerald-800">
            <motion.span 
              className="h-2 w-2 rounded-full bg-emerald-500"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            🎉 Profile Complete! You're ready to apply to jobs
          </div>
          <p className="text-sm text-slate-600 mt-3">
            Your profile is 100% complete and visible to employers. Keep it updated for better opportunities!
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ProfileCompletion;