// frontend/src/components/candidate/dashboard/WelcomeSection.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import { Sparkles, Calendar } from 'lucide-react';

const WelcomeSection = () => {
  const profile = useSelector(state => state.candidate.profile);
  
  const user = profile?.user || {};
  const fullName = user?.fullName || 'Candidate';
  const profileCompletion = profile?.profileCompletion?.percentage || 0;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="relative overflow-hidden mb-8 p-8 md:p-10 rounded-2xl bg-zinc-950 text-white shadow-xl">
      {/* Subtle technical dotted pattern background for an enterprise deep-tech feel */}
      <div 
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />
      
      {/* Soft gradient spotlight from the top-right to give it minimal depth without blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-zinc-800/40 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <motion.div 
          className="text-left"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300 text-[10px] font-bold tracking-[0.15em] uppercase mb-5">
             <Calendar className="w-3.5 h-3.5" />
             {today}
          </div>
          
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-zinc-100 mb-3">
            Welcome back, <span className="text-white">{fullName}</span>
          </h1>
          
          <p className="text-zinc-400 text-sm md:text-base max-w-xl leading-relaxed">
            {profileCompletion < 100 
              ? "Let's get your profile ready for your next big opportunity." 
              : "Your profile is fully optimized and ready for top employers."}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default WelcomeSection;