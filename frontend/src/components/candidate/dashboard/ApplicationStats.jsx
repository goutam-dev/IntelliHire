// frontend/src/components/candidate/dashboard/ApplicationStats.jsx
import React, { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useSelector, useDispatch } from "react-redux";
import { fetchMyApplications, clearApplicationsCache } from "../../../store/slices/jobApplicationsSlice";
import {
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  Calendar,
  Video,
  Award,
  Handshake,
  Ban,
  AlertCircle
} from "lucide-react";

import SkeletonLoader from "../../common/SkeletonLoader";

const StatCard = ({ number, label, icon: Icon, color, bg, borderLight, delay, isLoading }) => (
  <motion.div
    className="group relative overflow-hidden bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 flex items-center gap-4 transition-all duration-300 hover:shadow-lg hover:border-zinc-300"
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5, ease: "easeOut" }}
  >
    {isLoading ? (
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-5">
           <div className={`shrink-0 w-14 h-14 bg-zinc-100 rounded-2xl animate-pulse`}></div>
           <div className="space-y-2">
             <div className="h-6 w-12 bg-zinc-200 rounded animate-pulse"></div>
             <div className="h-3 w-20 bg-zinc-100 rounded animate-pulse"></div>
           </div>
        </div>
      </div>
    ) : (
      <>
        {/* Subtle radiant background matched to state */}
        <div className={`absolute inset-0 bg-gradient-to-br from-white via-white to-${bg}-100/20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
        <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${bg}`} />

        <div className={`shrink-0 relative z-10 h-12 w-12 rounded-2xl flex items-center justify-center transition-colors border ${borderLight} bg-zinc-50 group-hover:bg-white`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div className="flex flex-col relative z-10">
          <span className="text-2xl sm:text-3xl font-bold text-zinc-900 tracking-tight leading-none mb-1">
            {number}
          </span>
          <span className="text-[13px] font-semibold text-zinc-500 tracking-[0.05em] uppercase">
            {label}
          </span>
        </div>
        <div className="absolute top-4 right-4 text-zinc-300 group-hover:text-zinc-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300 z-10">
          <ArrowUpRight className="w-5 h-5 opacity-0 group-hover:opacity-100" />
        </div>
      </>
    )}
  </motion.div>
);

const STATUS_ITEMS = [
  { key: 'Applied', label: 'Applied', icon: Clock, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200/70' },
  { key: 'Shortlisted', label: 'Shortlisted', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200/60' },
  { key: 'Interview Scheduled', label: 'Interview Scheduled', icon: Calendar, color: 'text-cyan-600', bg: 'bg-cyan-100', border: 'border-cyan-200/60' },
  { key: 'Interviewed', label: 'Interviewed', icon: Video, color: 'text-teal-600', bg: 'bg-teal-100', border: 'border-teal-200/60' },
  { key: 'Finalist', label: 'Finalist', icon: Award, color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-200/60' },
  { key: 'Hired', label: 'Hired', icon: Handshake, color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200/60' },
  { key: 'Rejected', label: 'Rejected', icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-100', border: 'border-rose-200/60' },
  { key: 'Withdrawn', label: 'Withdrawn', icon: Ban, color: 'text-zinc-600', bg: 'bg-zinc-100', border: 'border-zinc-200/70' },
  { key: 'Job Deleted', label: 'Job Deleted', icon: AlertCircle, color: 'text-zinc-700', bg: 'bg-zinc-200', border: 'border-zinc-300/70' }
];

const BASE_COUNTS = STATUS_ITEMS.reduce((acc, item) => {
  acc[item.key] = 0;
  return acc;
}, { all: 0 });

const ApplicationStats = ({ stats }) => {
  const dispatch = useDispatch();
  const { myApplications, applicationStatusCounts, loading } = useSelector((state) => state.jobApplications);
  const isLoading = loading?.fetchingApplications || false;

  useEffect(() => {
    dispatch(clearApplicationsCache());
    dispatch(fetchMyApplications());
  }, [dispatch]);

  const calculatedStats = useMemo(() => {
    if (!myApplications || myApplications.length === 0) {
      return { ...BASE_COUNTS };
    }

    const counts = { ...BASE_COUNTS };
    (myApplications || []).forEach((app) => {
      const status = app?.status;
      if (!status || counts[status] === undefined) return;
      counts[status] += 1;
      if (status !== 'Withdrawn') {
        counts.all += 1;
      }
    });

    return counts;
  }, [myApplications]);

  const statusCountsReady = applicationStatusCounts
    ? Object.values(applicationStatusCounts).some((value) => value > 0)
    : false;

  const displayStats = stats || (statusCountsReady ? applicationStatusCounts : calculatedStats);

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          number={displayStats.all || 0}
          label="Applications"
          icon={Briefcase}
          color="text-zinc-700"
          bg="bg-zinc-200"
          borderLight="border-zinc-200"
          delay={0.05}
          isLoading={isLoading}
        />
        {STATUS_ITEMS.map((item, index) => (
          <StatCard
            key={item.key}
            number={displayStats[item.key] || 0}
            label={item.label}
            icon={item.icon}
            color={item.color}
            bg={item.bg}
            borderLight={item.border}
            delay={0.1 + index * 0.05}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
};

export default ApplicationStats;
