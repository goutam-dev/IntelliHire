// frontend/src/components/candidate/dashboard/QuickActions.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const QuickActions = ({ onModalOpen }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { incompleteSections, isComplete } = useSelector(
    (state) => state.profileCompletion
  );

  const actions = [
    {
      label: 'Browse Jobs',
      color: 'border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50',
      section: 'jobs',
      path: '/candidate/jobs',
      type: 'navigation'
    },
    {
      label: isComplete ? 'View Profile' : 'Complete Profile',
      color: 'bg-slate-900 text-white hover:bg-slate-800',
      section: 'profile',
      path: '/candidate/profile',
      type: 'profile'
    }
  ];

  const handleActionClick = (action) => {
    if (action.type === 'profile' && !isComplete && incompleteSections.length > 0) {
      // Open the first incomplete section modal
      const firstIncompleteSection = incompleteSections[0];
      if (onModalOpen && firstIncompleteSection) {
        onModalOpen(firstIncompleteSection.key);
      }
    } else {
      // Regular navigation
      try {
        navigate(action.path);
        console.log(`Successfully navigated to ${action.section}`);
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }
  };

  return (
    <motion.div 
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      whileHover={{ y: -2 }}
    >
      <h3 className="text-base font-semibold text-slate-900 mb-3">Quick Actions</h3>
      <div className="space-y-2">
        {actions.map((action, index) => (
          <motion.button
            key={action.label}
            onClick={() => handleActionClick(action)}
            className={`w-full inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${action.color}`}
            whileHover={{ scale: 1.02, x: 4 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {action.label}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default QuickActions;