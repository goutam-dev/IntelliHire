import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const SkeletonLoader = ({ type = 'card', count = 1, className = "" }) => {
  const items = useMemo(() => Array.from({ length: count }), [count]);

  const RenderSkeleton = () => {
    switch (type) {
      case 'layout-form':
        return (
          <div className={`min-h-screen bg-zinc-50/50 flex flex-col font-sans ${className}`}>
             <div className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 p-4 flex items-center justify-between">
              <div className="h-8 w-32 bg-zinc-200 rounded-md animate-pulse"></div>
              <div className="flex items-center gap-4">
                <div className="h-4 w-20 bg-zinc-200 rounded-md animate-pulse hidden sm:block"></div>
                <div className="h-10 w-10 bg-zinc-200 rounded-full animate-pulse"></div>
              </div>
            </div>
            <main className="flex-grow mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
               <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
                 <div className="h-8 w-1/3 bg-zinc-200 rounded-md animate-pulse mb-8"></div>
                 <div className="space-y-6">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <div className="h-4 w-1/4 bg-zinc-200 rounded-md animate-pulse"></div>
                        <div className="h-10 w-full bg-zinc-200 rounded-xl animate-pulse"></div>
                      </div>
                    ))}
                    <div className="pt-4 flex justify-end">
                       <div className="h-10 w-32 bg-zinc-200 rounded-xl animate-pulse"></div>
                    </div>
                 </div>
               </div>
            </main>
          </div>
        );
      case 'layout-list':
        return (
          <div className={`min-h-screen bg-zinc-50/50 flex flex-col font-sans ${className}`}>
             <div className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 p-4 flex items-center justify-between">
              <div className="h-8 w-32 bg-zinc-200 rounded-md animate-pulse"></div>
              <div className="flex items-center gap-4">
                <div className="h-4 w-20 bg-zinc-200 rounded-md animate-pulse hidden sm:block"></div>
                <div className="h-10 w-10 bg-zinc-200 rounded-full animate-pulse"></div>
              </div>
            </div>
            <main className="flex-grow mx-auto max-w-6xl w-full px-6 py-12 space-y-8">
               <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                 <div className="h-8 w-48 bg-zinc-200 rounded-md animate-pulse"></div>
                 <div className="h-10 w-64 bg-zinc-200 rounded-xl animate-pulse"></div>
               </div>
               <div className="space-y-4">
                 {[...Array(6)].map((_, i) => (
                   <div key={i} className="h-24 w-full bg-white border border-zinc-200 rounded-2xl animate-pulse shadow-sm p-4 flex items-center justify-between">
                     <div className="space-y-3 w-1/2">
                       <div className="h-5 w-2/3 bg-zinc-200 rounded"></div>
                       <div className="h-4 w-1/3 bg-zinc-100 rounded"></div>
                     </div>
                     <div className="h-10 w-24 bg-zinc-200 rounded-xl"></div>
                   </div>
                 ))}
               </div>
            </main>
          </div>
        );
      case 'layout-profile':
        return (
          <div className={`min-h-screen bg-zinc-50/50 flex flex-col font-sans ${className}`}>
             <div className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 p-4 flex items-center justify-between">
              <div className="h-8 w-32 bg-zinc-200 rounded-md animate-pulse"></div>
              <div className="flex items-center gap-4">
                <div className="h-4 w-20 bg-zinc-200 rounded-md animate-pulse hidden sm:block"></div>
                <div className="h-10 w-10 bg-zinc-200 rounded-full animate-pulse"></div>
              </div>
            </div>
            <main className="flex-grow mx-auto max-w-6xl w-full px-6 py-12 space-y-8">
               {/* Profile Header */}
               <div className="bg-white rounded-2xl border border-zinc-200 p-8 flex flex-col md:flex-row gap-8 items-start shadow-sm">
                  <div className="h-32 w-32 rounded-full bg-zinc-200 animate-pulse shrink-0"></div>
                  <div className="space-y-4 w-full">
                    <div className="h-8 w-1/3 bg-zinc-200 rounded animate-pulse"></div>
                    <div className="h-4 w-1/4 bg-zinc-100 rounded animate-pulse"></div>
                    <div className="flex gap-4 pt-4">
                      <div className="h-10 w-24 bg-zinc-200 rounded-xl animate-pulse"></div>
                      <div className="h-10 w-24 bg-zinc-200 rounded-xl animate-pulse"></div>
                    </div>
                  </div>
               </div>
               {/* Profile sections */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                     {[...Array(2)].map((_, i) => (
                       <div key={i} className="bg-white rounded-2xl border border-zinc-200 p-8 space-y-6 shadow-sm">
                          <div className="h-6 w-1/4 bg-zinc-200 rounded animate-pulse"></div>
                          <div className="space-y-4">
                            <div className="h-10 w-full bg-zinc-100 rounded animate-pulse"></div>
                            <div className="h-10 w-full bg-zinc-100 rounded animate-pulse"></div>
                          </div>
                       </div>
                     ))}
                  </div>
                  <div className="space-y-8">
                     <div className="bg-white rounded-2xl border border-zinc-200 p-8 space-y-6 shadow-sm">
                        <div className="h-6 w-1/2 bg-zinc-200 rounded animate-pulse"></div>
                        <div className="flex flex-wrap gap-2">
                           {[...Array(6)].map((_, i) => (
                             <div key={i} className="h-8 w-16 bg-zinc-200 rounded-full animate-pulse"></div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            </main>
          </div>
        );
      case 'layout-landing':
        return (
          <div className={`min-h-screen bg-slate-50 flex flex-col font-sans ${className}`}>
             {/* Header Skeleton */}
             <div className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 p-4 flex items-center justify-between px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 bg-slate-200 rounded-xl animate-pulse"></div>
                <div className="h-6 w-24 bg-slate-200 rounded-md animate-pulse"></div>
              </div>
              <div className="hidden md:flex items-center gap-6">
                 {[...Array(5)].map((_, i) => (
                   <div key={i} className="h-4 w-16 bg-slate-200 rounded animate-pulse"></div>
                 ))}
              </div>
              <div className="hidden md:flex items-center gap-3">
                 <div className="h-9 w-20 bg-slate-200 rounded-full animate-pulse"></div>
                 <div className="h-9 w-24 bg-slate-900/20 rounded-full animate-pulse"></div>
              </div>
            </div>
            {/* Hero Content Skeleton */}
            <main className="flex-grow mx-auto max-w-6xl w-full px-4 pt-20 pb-16 sm:px-6 sm:pt-24 sm:pb-20 lg:flex-row lg:items-start lg:gap-12 lg:px-8 lg:pb-24 flex flex-col lg:flex-row gap-10">
               <div className="w-full lg:w-1/2 space-y-6 sm:space-y-8 pt-4">
                  <div className="space-y-4">
                     <div className="h-12 sm:h-16 w-3/4 bg-slate-200 rounded-lg animate-pulse"></div>
                     <div className="h-12 sm:h-16 w-5/6 bg-slate-200 rounded-lg animate-pulse"></div>
                     <div className="h-4 w-full bg-slate-200 rounded animate-pulse mt-6"></div>
                     <div className="h-4 w-11/12 bg-slate-200 rounded animate-pulse"></div>
                     <div className="h-4 w-4/5 bg-slate-200 rounded animate-pulse"></div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                     <div className="h-12 w-full sm:w-48 bg-slate-900/20 rounded-full animate-pulse"></div>
                     <div className="h-12 w-full sm:w-48 bg-slate-200 rounded-full animate-pulse"></div>
                  </div>
               </div>
               <div className="w-full lg:w-1/2">
                  <div className="h-[400px] w-full rounded-3xl bg-slate-200 animate-pulse border border-slate-300 shadow-xl"></div>
               </div>
            </main>
          </div>
        );
      case 'dashboard-layout':
        return (
          <div className={`min-h-screen bg-zinc-50/50 flex flex-col font-sans ${className}`}>
            {/* Header Skeleton */}
            <div className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/80 p-4 flex items-center justify-between">
              <div className="h-8 w-32 bg-zinc-200 rounded-md animate-pulse"></div>
              <div className="flex items-center gap-4">
                <div className="h-4 w-20 bg-zinc-200 rounded-md animate-pulse hidden sm:block"></div>
                <div className="h-10 w-10 bg-zinc-200 rounded-full animate-pulse"></div>
              </div>
            </div>
            {/* Main Content Skeleton */}
            <main className="flex-grow mx-auto max-w-6xl w-full px-6 py-12 space-y-12">
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                 <div className="space-y-4">
                   <div className="h-4 w-32 bg-zinc-200 rounded-md animate-pulse"></div>
                   <div className="h-10 w-64 bg-zinc-200 rounded-md animate-pulse"></div>
                 </div>
                 <div className="h-10 w-28 bg-zinc-200 rounded-xl animate-pulse"></div>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                 {[...Array(4)].map((_, i) => (
                   <div key={i} className="h-32 w-full bg-white border border-zinc-200 rounded-2xl animate-pulse shadow-sm flex flex-col p-6 justify-between">
                     <div className="h-3 w-1/3 bg-zinc-200 rounded"></div>
                     <div className="h-8 w-1/2 bg-zinc-200 rounded"></div>
                   </div>
                 ))}
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                 {[...Array(2)].map((_, i) => (
                   <div key={i} className="h-64 w-full bg-white border border-zinc-200 rounded-2xl animate-pulse shadow-sm p-6">
                      <div className="h-5 w-1/3 bg-zinc-200 rounded mb-6"></div>
                      <div className="space-y-4">
                        <div className="h-4 w-full bg-zinc-100 rounded"></div>
                        <div className="h-4 w-5/6 bg-zinc-100 rounded"></div>
                        <div className="h-4 w-4/6 bg-zinc-100 rounded"></div>
                      </div>
                   </div>
                 ))}
              </div>
            </main>
          </div>
        );
      case 'stat-card':
        return (
          <div className={`p-6 rounded-2xl border border-zinc-200 bg-white shadow-sm flex flex-col justify-between ${className}`}>
            <div className="h-4 w-24 bg-zinc-200 rounded-md animate-pulse mb-6"></div>
            <div className="h-8 w-12 bg-zinc-200 rounded-md animate-pulse mb-4"></div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-zinc-200 animate-pulse"></div>
              <div className="h-3 w-16 bg-zinc-200 rounded-md animate-pulse"></div>
            </div>
          </div>
        );
      case 'profile-header':
        return (
          <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 ${className}`}>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 bg-zinc-200 rounded-md animate-pulse"></div>
                <div className="h-3 w-32 bg-zinc-200 rounded-md animate-pulse"></div>
              </div>
              <div className="h-8 w-64 bg-zinc-200 rounded-md animate-pulse"></div>
            </div>
            <div className="h-20 w-48 rounded-2xl bg-zinc-200 animate-pulse"></div>
          </div>
        );
      case 'list-item':
        return (
          <div className={`flex items-center gap-4 p-4 ${className}`}>
            <div className="h-12 w-12 rounded-full bg-zinc-200 animate-pulse flex-shrink-0"></div>
            <div className="flex-1 space-y-3">
              <div className="h-4 w-1/3 bg-zinc-200 rounded-md animate-pulse"></div>
              <div className="h-3 w-1/4 bg-zinc-200 rounded-md animate-pulse"></div>
            </div>
            <div className="h-8 w-20 bg-zinc-200 rounded-lg animate-pulse"></div>
          </div>
        );
      case 'form':
        return (
          <div className={`space-y-6 ${className}`}>
            <div className="h-6 w-48 bg-zinc-200 rounded-md animate-pulse mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-zinc-200 rounded-md animate-pulse"></div>
                  <div className="h-10 w-full bg-zinc-200 rounded-xl animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'card':
      default:
        return (
          <div className={`p-6 rounded-2xl border border-zinc-200 bg-white shadow-sm space-y-4 ${className}`}>
            <div className="h-6 w-1/3 bg-zinc-200 rounded-md animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-zinc-200 rounded-md animate-pulse"></div>
              <div className="h-4 w-5/6 bg-zinc-200 rounded-md animate-pulse"></div>
            </div>
            <div className="h-10 w-24 bg-zinc-200 rounded-xl animate-pulse mt-4"></div>
          </div>
        );
    }
  };

  if (count === 1) return <RenderSkeleton />;
  
  return (
    <>
      {items.map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.1 }}
        >
          <RenderSkeleton />
        </motion.div>
      ))}
    </>
  );
};

export default SkeletonLoader;