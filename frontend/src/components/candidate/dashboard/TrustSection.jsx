// frontend/src/components/candidate/dashboard/TrustSection.jsx
import React from 'react';
import { motion } from 'framer-motion';

const CheckIcon = ({ className = "h-4 w-4" }) => (
  <motion.svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    aria-hidden="true"
  >
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </motion.svg>
);

const TrustSection = () => {
  const benefits = [
    "Fair, consistent candidate evaluation",
    "Secure, authenticated remote interviews", 
    "Faster, data-informed hiring decisions",
    "Better candidate experience & reduced bias",
    "Designed for scalable remote recruitment"
  ];

  const features = ["Secure sessions", "Bias review signals", "Evidence logs"];

  return (
    <motion.div 
      className="rounded-2xl border border-slate-200 bg-slate-900 text-white p-6"
      whileHover={{ y: -2 }}
    >
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <div className="lg:w-1/2 space-y-3">
          <motion.h2 
            className="text-xl font-semibold"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            Why IntelliHire earns trust
          </motion.h2>
          <motion.p 
            className="text-slate-200 text-xs"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            Developed as part of an academic research initiative on structured recruitment systems. 
            IntelliHire pairs rigorous verification with practical UX for hiring teams and applicants.
          </motion.p>
          <motion.div 
            className="flex flex-wrap gap-1.5 text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {features.map((item, index) => (
              <motion.span
                key={item}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/30 px-2.5 py-0.5 font-medium text-slate-100"
                whileHover={{ scale: 1.05 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <CheckIcon className="h-2.5 w-2.5" />
                {item}
              </motion.span>
            ))}
          </motion.div>
        </div>
        <div className="lg:w-1/2 grid gap-2">
          {benefits.map((benefit, index) => (
            <motion.div 
              key={benefit}
              className="flex items-center gap-2.5 text-xs text-slate-100"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              whileHover={{ x: 4 }}
            >
              <motion.span 
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 flex-shrink-0"
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <CheckIcon className="h-2.5 w-2.5" />
              </motion.span>
              <span>{benefit}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default TrustSection;