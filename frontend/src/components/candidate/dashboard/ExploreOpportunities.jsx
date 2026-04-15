import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

const ExploreOpportunities = () => {
  const navigate = useNavigate();

  return (
    <motion.div 
      className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-900 p-6 shadow-xl h-full flex flex-col justify-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-48 h-48 bg-zinc-800/40 rounded-full blur-[40px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-blue-900/10 rounded-full blur-[30px] pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 w-full">
        <div className="space-y-2 flex-1 text-center sm:text-left">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center justify-center sm:justify-start gap-2">
            <Sparkles className="h-5 w-5 text-zinc-400" />
            Ready for your next big move?
          </h2>
          <p className="text-sm font-medium text-zinc-400 max-w-md mx-auto sm:mx-0 leading-relaxed">
            Discover roles that perfectly align with your experience and unlock your potential using our smart matching.
          </p>
        </div>

        <div className="flex-shrink-0 w-full sm:w-auto">
          <motion.button
            onClick={() => navigate('/candidate/jobs')}
            className="group relative flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-zinc-900 transition-all hover:bg-zinc-100 hover:shadow-xl hover:shadow-white/10 whitespace-nowrap"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Find best matching jobs"
          >
            Explore Jobs
            <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default ExploreOpportunities;