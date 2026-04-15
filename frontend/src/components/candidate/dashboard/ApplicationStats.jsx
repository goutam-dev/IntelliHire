// frontend/src/components/candidate/dashboard/ApplicationStats.jsx
import React, { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { fetchMyApplications, clearApplicationsCache } from "../../../store/slices/jobApplicationsSlice";
import { Briefcase, Clock, CheckCircle, XCircle, ArrowUpRight } from "lucide-react";

const StatCard = ({ number, label, icon: Icon, color, bg, borderLight, delay }) => (
  <motion.div
    className="group relative overflow-hidden bg-white rounded-2xl border border-zinc-200 p-6 flex items-center gap-5 transition-all duration-300 hover:shadow-lg hover:border-zinc-300"
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: "easeOut" }}
  >
    {/* Subtle radiant background matched to state */}
    <div className={`absolute inset-0 bg-gradient-to-br from-white via-white to-${bg}-100/20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
    <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${bg}`} />

    <div className={`shrink-0 relative z-10 h-14 w-14 rounded-2xl flex items-center justify-center transition-colors border ${borderLight} bg-zinc-50 group-hover:bg-white`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <div className="flex flex-col relative z-10">
      <span className="text-3xl font-bold text-zinc-900 tracking-tight leading-none mb-1">
        {number}
      </span>
      <span className="text-[13px] font-semibold text-zinc-500 tracking-[0.05em] uppercase">
        {label}
      </span>
    </div>
    <div className="absolute top-4 right-4 text-zinc-300 group-hover:text-zinc-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300 z-10">
      <ArrowUpRight className="w-5 h-5 opacity-0 group-hover:opacity-100" />
    </div>
  </motion.div>
);

const ApplicationStats = ({ stats }) => {
  const dispatch = useDispatch();
  const { myApplications, loading } = useSelector((state) => state.jobApplications);
  const isLoading = loading?.fetchingApplications || false;

  useEffect(() => {
    dispatch(clearApplicationsCache());
    dispatch(fetchMyApplications());
  }, [dispatch]);

  const calculatedStats = useMemo(() => {
    if (!myApplications || myApplications.length === 0) {
      return { totalApplications: 0, pending: 0, shortlisted: 0, rejected: 0 };
    }

    const activeApplications = myApplications.filter(app => 
      app.status?.toLowerCase() !== 'withdrawn'
    );

    const statusCounts = activeApplications.reduce((acc, app) => {
      const status = app.status?.toLowerCase() || 'pending';
      if (['applied', 'pending', 'under review'].includes(status)) {
        acc.pending++;
      } else if (['shortlisted', 'interview', 'accepted', 'hired'].includes(status)) {
        acc.shortlisted++;
      } else if (status === 'rejected') {
        acc.rejected++;
      }
      return acc;
    }, { pending: 0, shortlisted: 0, rejected: 0 });

    return { totalApplications: activeApplications.length, ...statusCounts };
  }, [myApplications]);

  const displayStats = stats || calculatedStats;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-6">
        <h3 className="text-sm font-semibold tracking-wide text-zinc-900 uppercase">
          Application Overview
        </h3>
        {isLoading && (
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 bg-zinc-400 rounded-full animate-bounce"></span>
            <span className="h-1.5 w-1.5 bg-zinc-400 rounded-full animate-bounce delay-75"></span>
            <span className="h-1.5 w-1.5 bg-zinc-400 rounded-full animate-bounce delay-150"></span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          number={displayStats.totalApplications || 0}
          label="Applications"
          icon={Briefcase}
          color="text-zinc-700"
          bg="bg-zinc-200"
          borderLight="border-zinc-200"
          delay={0.1}
        />
        <StatCard
          number={displayStats.pending || 0}
          label="In Review"
          icon={Clock}
          color="text-amber-600"
          bg="bg-amber-100"
          borderLight="border-amber-200/50"
          delay={0.2}
        />
        <StatCard
          number={displayStats.shortlisted || 0}
          label="Shortlisted"
          icon={CheckCircle}
          color="text-emerald-600"
          bg="bg-emerald-100"
          borderLight="border-emerald-200/50"
          delay={0.3}
        />
        <StatCard
          number={displayStats.rejected || 0}
          label="Rejected"
          icon={XCircle}
          color="text-rose-600"
          bg="bg-rose-100"
          borderLight="border-rose-200/50"
          delay={0.4}
        />
      </div>
    </div>
  );
};

export default ApplicationStats;
