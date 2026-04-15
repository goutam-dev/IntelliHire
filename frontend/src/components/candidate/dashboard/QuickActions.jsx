// frontend/src/components/candidate/dashboard/QuickActions.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Search, UserCircle, ArrowRight } from 'lucide-react';

const QuickActions = ({ onModalOpen }) => {
  const navigate = useNavigate();
  const { incompleteSections, isComplete } = useSelector(
    (state) => state.profileCompletion
  );

  const actions = [
    {
      label: 'Explore Opportunities',
      desc: 'Find jobs tailored to your skills',
      icon: Search,
      bg: 'bg-zinc-900',
      text: 'text-white',
      border: 'border-transparent',
      hover: 'hover:bg-zinc-800 hover:shadow-lg hover:shadow-zinc-900/20',
      iconColor: 'text-zinc-300',
      section: 'jobs',
      path: '/candidate/jobs',
      type: 'navigation'
    },
    {
      label: isComplete ? 'Manage Profile' : 'Update Profile',
      desc: isComplete ? 'Keep your information current' : 'Complete missing details',
      icon: UserCircle,
      bg: 'bg-white',
      text: 'text-zinc-900',
      border: 'border-zinc-200',
      hover: 'hover:bg-zinc-50 hover:border-zinc-300 hover:shadow-md',
      iconColor: 'text-zinc-500',
      section: 'profile',
      path: '/candidate/profile',
      type: 'profile'
    }
  ];

  const handleActionClick = (action) => {
    if (action.type === 'profile' && !isComplete && incompleteSections.length > 0) {
      const firstIncompleteSection = incompleteSections[0];
      if (onModalOpen && firstIncompleteSection) {
        onModalOpen(firstIncompleteSection.key);
      }
    } else {
      try {
        navigate(action.path);
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }
  };

  return (
    <div className="grid gap-3">
      {actions.map((action, index) => (
        <motion.button
          key={action.label}
          onClick={() => handleActionClick(action)}
          className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-200 text-left ${action.bg} ${action.text} ${action.border} ${action.hover}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${action.bg === 'bg-white' ? 'bg-zinc-100' : 'bg-zinc-800'}`}>
              <action.icon className={`w-5 h-5 ${action.iconColor}`} />
            </div>
            <div>
              <div className="font-medium text-sm tracking-wide">{action.label}</div>
              <div className={`text-xs mt-0.5 ${action.bg === 'bg-white' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {action.desc}
              </div>
            </div>
          </div>
          <ArrowRight className={`w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all ${action.bg === 'bg-white' ? 'text-zinc-400' : 'text-zinc-400'}`} />
        </motion.button>
      ))}
    </div>
  );
};

export default QuickActions;