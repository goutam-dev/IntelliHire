import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarClock,
  Handshake,
  LayoutDashboard,
  MapPin,
  Users,
  Target,
  Activity,
  CalendarDays,
  ArrowRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import EmployerHeader from '../../components/layout/EmployerHeader';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import { fetchEmployerJobs } from '../../store/slices/jobSlice';
import { fetchEmployerProfile } from '../../store/slices/employerSlice';
import { useAuth, useClerk, useUser } from '@clerk/clerk-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

const StatCard = ({ label, value, subtext, color = "bg-cyan-500", gradientFrom, gradientTo, isLoading }) => (
  <motion.div
    variants={itemVariants}
    className="group relative flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 overflow-hidden"
  >
    {isLoading ? (
      <div className="space-y-4">
        <div className="h-3 w-24 bg-zinc-200 rounded animate-pulse mb-3"></div>
        <div className="h-10 w-16 bg-zinc-200 rounded-lg animate-pulse"></div>
        {subtext && <div className="h-3 w-3/4 bg-zinc-100 rounded animate-pulse mt-4"></div>}
      </div>
    ) : (
      <>
        <div className={`absolute top-0 left-0 h-full w-1 bg-gradient-to-b ${gradientFrom} ${gradientTo} opacity-80`} />
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-4xl font-extrabold text-zinc-900 tracking-tight">{value}</h3>
          </div>
        </div>
        {subtext && (
          <div className="mt-4 flex items-center gap-2">
            <div className={`h-1.5 w-1.5 rounded-full ${color}`} />
            <p className="text-xs font-medium text-zinc-500">
              {subtext}
            </p>
          </div>
        )}

        {/* Decorative background element */}
        <div className={`absolute -right-6 -bottom-6 h-24 w-24 rounded-full ${color} opacity-5 blur-2xl transition-opacity group-hover:opacity-10`} />
      </>
    )}
  </motion.div>
);

const ActionButton = ({ icon: Icon, label, onClick, primary = false }) => (
  <motion.button
    whileHover={{ y: -2 }}
    whileTap={{ y: 0 }}
    onClick={onClick}
    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all shadow-sm
      ${primary
        ? 'bg-zinc-900 text-white hover:bg-zinc-800'
        : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-300 hover:text-zinc-900'
      }`}
  >
    <Icon className="h-4 w-4" />
    {label}
  </motion.button>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { jobs, jobsLoading } = useAppSelector((state) => state.jobs);
  const { profile, loading: profileLoading } = useAppSelector((state) => state.employer);

  const [stats, setStats] = useState({
    activeJobs: 0,
    draftJobs: 0,
    closedJobs: 0,
    archivedJobs: 0,
    totalJobs: 0,
    totalApplications: 0,
    uniqueCandidates: 0,
    newApplications: 0
  });
  const [recentApplications, setRecentApplications] = useState([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const token = await getToken();
        
        // Fetch jobs for the recent jobs list
        dispatch(fetchEmployerJobs({ token }));
        dispatch(fetchEmployerProfile({ token }));

        // Fetch dashboard stats
        const res = await fetch(`${API_BASE}/employer/dashboard/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) throw new Error('Failed to load dashboard stats');
        
        const data = await res.json();
        setStats({
          activeJobs: data.activeJobs,
          draftJobs: data.draftJobs,
          closedJobs: data.closedJobs,
          archivedJobs: data.archivedJobs,
          totalJobs: data.totalJobs,
          totalApplications: data.totalApplications,
          uniqueCandidates: data.uniqueCandidates || 0,
          newApplications: data.newApplications
        });
        setRecentApplications(data.recentApplications || []);
        setUpcomingInterviews(data.upcomingInterviews || []);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [dispatch, getToken]);

  const recentJobs = useMemo(() => {
    return [...jobs]
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 4);
  }, [jobs]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Safely access user name
  const firstName = user?.firstName || profile?.user?.fullName?.split(' ')[0] || 'Employer';

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getApplicationDate = (app) => {
    if (app.createdAt) {
      const date = new Date(app.createdAt);
      if (!isNaN(date.getTime())) return date.toLocaleDateString();
    }
    // Fallback to _id timestamp if available
    if (app._id) {
      try {
        const timestamp = parseInt(app._id.substring(0, 8), 16) * 1000;
        return new Date(timestamp).toLocaleDateString();
      } catch (e) {
        return 'N/A';
      }
    }
    return 'N/A';
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 text-zinc-900 font-sans selection:bg-zinc-200 selection:text-zinc-900">
      <EmployerHeader 
        userName={user?.fullName || profile?.user?.fullName}
        companyName={profile?.companyName}
        userImage={user?.imageUrl}
        onLogout={handleLogout}
      />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-12"
        >
          {/* Header Section */}
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <motion.div variants={itemVariants} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard Overview</span>
              </motion.div>
              <motion.h1 variants={itemVariants} className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
                {getGreeting()}, <span>{firstName}</span>
              </motion.h1>
            </div>
            <motion.div variants={itemVariants} className="flex gap-3">
              <ActionButton
                icon={Plus}
                label="Post Job"
                primary
                onClick={() => navigate('/employer/jobs/create')}
              />
            </motion.div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Active Jobs"
              value={stats.activeJobs}
              subtext={`${stats.totalJobs} total jobs posted`}
              color="bg-emerald-500"
              gradientFrom="from-emerald-400"
              gradientTo="to-emerald-600"
              isLoading={loading.stats}
            />
            <StatCard
              label="Total Applications"
              value={stats.totalApplications}
              subtext="Across all your listings"
              color="bg-cyan-500"
              gradientFrom="from-cyan-400"
              gradientTo="to-cyan-600"
              isLoading={loading.stats}
            />
            <StatCard
              label="Individual Applicants"
              value={stats.uniqueCandidates}
              subtext="Distinct individuals"
              color="bg-indigo-500"
              gradientFrom="from-indigo-400"
              gradientTo="to-indigo-600"
              isLoading={loading.stats}
            />
            <StatCard
              label="New Applications"
              value={stats.newApplications}
              subtext="Received in the last 24 hours"
              color="bg-rose-500"
              gradientFrom="from-rose-400"
              gradientTo="to-rose-600"
              isLoading={loading.stats}
            />
          </div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            {/* Main Content Column */}
            <div className="lg:col-span-2 space-y-10">

              {/* Recent Jobs Section */}
              <section>
                <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="uppercase tracking-widest text-xs text-zinc-500 font-bold mb-1">Your Postings</p>
                    <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">Recent Jobs</h2>
                  </div>
                  <button
                    onClick={() => navigate('/employer/jobs')}
                    className="mt-3 sm:mt-0 group flex items-center gap-1 text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-900"
                  >
                    View all <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {jobsLoading ? (
                      <div className="col-span-full grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <SkeletonLoader type="card" count={2} />
                    </div>
                  ) : recentJobs.length === 0 ? (
                    <div className="col-span-full rounded-2xl border border-dashed border-zinc-300 bg-white py-16 text-center shadow-sm">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 mb-4">
                        <Briefcase className="h-6 w-6 text-zinc-400" />
                      </div>
                      <p className="text-sm font-medium text-zinc-600">No jobs posted yet.</p>
                      <button onClick={() => navigate('/employer/jobs/create')} className="mt-2 text-sm font-bold text-zinc-900 hover:text-zinc-700 transition-colors">Create your first job</button>
                    </div>
                  ) : (
                    recentJobs.map((job) => (
                      <div
                        key={job._id}
                        onClick={() => navigate(`/employer/jobs/${job._id}/applications`)}
                        className="group relative flex cursor-pointer overflow-hidden flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 hover:shadow-lg hover:-translate-y-1"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 to-white opacity-0 transition-opacity group-hover:opacity-100 z-0 pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                          <div className="flex items-start justify-between">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100/80 text-zinc-600 transition-colors group-hover:bg-zinc-900 group-hover:text-white shadow-sm border border-zinc-200 group-hover:border-zinc-900">
                              <Briefcase className="h-5 w-5" />
                            </div>
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold tracking-wide uppercase shadow-sm
                              ${job.status === 'active' ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20' :
                                job.status === 'draft' ? 'bg-zinc-100 text-zinc-600 border border-zinc-200' :
                                  'bg-rose-500/10 text-rose-700 border border-rose-500/20'}`}>
                              <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${job.status === 'active' ? 'bg-emerald-500' : job.status === 'draft' ? 'bg-zinc-400' : 'bg-rose-500'}`}></span>
                              {job.status}
                            </span>
                          </div>

                          <div className="mt-5">
                            <h3 className="text-lg font-extrabold text-zinc-900 group-hover:text-black transition-colors line-clamp-1">
                              {job.title}
                            </h3>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-1 bg-zinc-50 text-zinc-600 px-2.5 py-1 rounded-md text-[11px] font-extrabold border border-zinc-200/60 uppercase tracking-wider">
                                {job.department || 'General'}
                              </span>
                              <span className="inline-flex items-center gap-1 bg-zinc-50 text-zinc-600 px-2.5 py-1 rounded-md text-[11px] font-extrabold border border-zinc-200/60 uppercase tracking-wider">
                                <Users className="h-3 w-3" /> {job.employmentType || 'Full-time'}
                              </span>
                            </div>
                          </div>

                          <div className="mt-6 flex items-center justify-between border-t border-zinc-100 pt-4">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 shadow-sm border border-zinc-200">
                                <Users className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-sm font-extrabold text-zinc-700">
                                {job.applicationsCount || 0} <span className="font-bold text-zinc-500">Candidates</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-sm font-bold text-zinc-400 group-hover:text-zinc-900 transition-colors">
                              View <ArrowRight className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Recent Applications Section */}
              <section>
                <div className="mb-6 flex justify-between items-end">
                  <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">Recent Applications</h2>
                  {recentApplications.length > 5 && (
                    <button
                      onClick={() => navigate('/employer/jobs')}
                      className="text-sm font-bold text-zinc-600 hover:text-zinc-900 transition-colors"
                    >
                      View all
                    </button>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                  {loading ? (
                      <div className="divide-y divide-zinc-100">
                        <SkeletonLoader type="list-item" count={4} />
                    </div>
                  ) : recentApplications.length === 0 ? (
                    <div className="py-16 text-center text-sm font-medium text-zinc-500">No recent applications found.</div>
                  ) : (
                    <div className="divide-y divide-zinc-100">
                      {recentApplications.slice(0, 5).map((app) => (
                        <div
                          key={app._id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-6 transition-all hover:bg-zinc-50/80 group gap-4"
                        >
                          <div className="flex items-start sm:items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-100 text-lg font-bold text-zinc-900 shadow-sm">
                              {app?.candidate?.user?.fullName?.charAt(0) || 'C'}
                            </div>
                            <div>
                              <h3 className="text-base font-extrabold text-zinc-900 group-hover:text-zinc-700 transition-colors">{app?.candidate?.user?.fullName || 'Candidate'}</h3>
                              <p className="text-sm font-medium text-zinc-500 mt-1">
                                Applied for <span className="text-zinc-800 font-bold bg-zinc-100/80 px-1.5 py-0.5 rounded-md">{app?.job?.title}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-5">
                            <span className="text-sm font-bold text-zinc-400">
                              {getApplicationDate(app)}
                            </span>
                            <button
                              onClick={() => app?.job?._id && navigate(`/employer/jobs/${app.job._id}/applications`)}
                              disabled={!app?.job?._id}
                              className="bg-white border border-zinc-200 text-zinc-900 font-bold text-xs px-4 py-2 hover:bg-zinc-50 hover:border-zinc-300 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-zinc-200"
                            >
                              Review
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Sidebar Column */}
            <div className="space-y-10">
              <section>
                <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between">
                  <div>
                    <p className="uppercase tracking-widest text-xs text-zinc-500 font-bold mb-1">Workspace</p>
                    <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">Tools & Overview</h2>
                  </div>
                </div>

                <div className="space-y-6">
                  <motion.div variants={itemVariants} className="rounded-2xl bg-zinc-950 p-6 text-white shadow-xl relative overflow-hidden group">
                    {/* Subtle dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/50 to-zinc-950/50 pointer-events-none" />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 relative z-10 mb-6">Quick Actions</h3>
                    <div className="space-y-3 relative z-10">
                      <button
                        onClick={() => navigate('/employer/jobs/create')}
                        className="flex w-full items-center justify-between rounded-xl bg-white/10 px-5 py-4 text-sm font-extrabold transition-all hover:bg-white/20 hover:-translate-y-0.5"
                      >
                        <span>Post a Job</span>
                        <Plus className="h-5 w-5 opacity-90" />
                      </button>
                      <button
                        onClick={() => navigate('/employer/jobs')}
                        className="flex w-full items-center justify-between rounded-xl bg-white/10 px-5 py-4 text-sm font-extrabold transition-all hover:bg-white/20 hover:-translate-y-0.5"
                      >
                        <span>Manage Listings</span>
                        <Briefcase className="h-5 w-5 opacity-90" />
                      </button>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6">Job Flow Overview</h3>
                    <div className="space-y-6">
                      {[
                        { label: 'Active Listings', value: stats.activeJobs, total: stats.totalJobs, color: 'bg-emerald-500' },
                        { label: 'Drafts', value: stats.draftJobs, total: stats.totalJobs, color: 'bg-zinc-300' },
                        ...(stats.closedJobs > 0 ? [{ label: 'Closed', value: stats.closedJobs, total: stats.totalJobs, color: 'bg-rose-500' }] : []),
                        ...(stats.archivedJobs > 0 ? [{ label: 'Archived', value: stats.archivedJobs, total: stats.totalJobs, color: 'bg-cyan-500' }] : []),
                      ].map((item) => (
                        <div key={item.label} className="space-y-2">
                          <div className="flex justify-between text-sm font-bold">
                            <span className="text-zinc-600">{item.label}</span>
                            <span className="text-zinc-900">{Math.round((item.value / (item.total || 1)) * 100)}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.color} transition-all duration-1000 ease-out`}
                              style={{ width: `${(item.value / (item.total || 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Upcoming Interviews Widget */}
                  <motion.div variants={itemVariants} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <CalendarClock className="h-32 w-32" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Upcoming Interviews</h3>
                        <CalendarClock className="h-4 w-4 text-zinc-400" />
                      </div>
                      
                      <div className="space-y-4">
                          {loading ? (
                            <SkeletonLoader type="list-item" count={3} />
                          ) : upcomingInterviews.length === 0 ? (
                          <div className="text-center py-6 text-zinc-500 text-sm font-medium">
                            No upcoming interviews right now.
                          </div>
                        ) : (
                          upcomingInterviews.slice(0, 3).map((interview, index) => {
                            const name = interview.candidate?.user?.fullName || 'Candidate';
                            const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                            
                            // Colors map to break up the monochrome
                            const colors = [
                              'bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:text-indigo-600',
                              'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:text-emerald-600',
                              'bg-rose-50 text-rose-600 border-rose-100 group-hover:text-rose-600'
                            ];
                            const colorClass = colors[index % colors.length];

                            // Formatting start and end times to dates instead
                            const startDate = new Date(interview.interviewWindowStart || interview.createdAt || Date.now());
                            const endDate = interview.interviewWindowEnd ? new Date(interview.interviewWindowEnd) : null;
                            
                            const options = { month: 'short', day: 'numeric' };
                            const startStr = startDate.toLocaleDateString([], options);
                            const endStr = endDate ? endDate.toLocaleDateString([], options) : '';
                            
                            const dateDisplay = (endStr && startStr !== endStr) ? `${startStr} - ${endStr}` : startStr;

                            // Let's create a dynamic relative day label for the top
                            const today = new Date();
                            const isToday = startDate.getDate() === today.getDate() && startDate.getMonth() === today.getMonth();
                            const isTomorrow = startDate.getDate() === today.getDate() + 1 && startDate.getMonth() === today.getMonth();
                            const relativeDay = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : 'Scheduled';
                            
                            const dayColor = isToday ? 'text-indigo-500' : 'text-zinc-500';

                            return (
                              <div 
                                key={interview._id}
                                onClick={() => interview?.job?._id && navigate(`/employer/jobs/${interview.job._id}/applications`)}
                                className={`group flex items-center justify-between p-3 -mx-3 rounded-xl transition-colors border ${interview?.job?._id ? 'hover:bg-zinc-50 cursor-pointer border-transparent hover:border-zinc-100' : 'border-transparent opacity-60 cursor-not-allowed'}`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-extrabold text-sm border shadow-sm ${colorClass.split('group-hover')[0]}`}>
                                    {initials}
                                  </div>
                                  <div>
                                    <p className={`text-sm font-extrabold text-zinc-900 transition-colors line-clamp-1 ${colorClass.split(' ').pop()}`}>{name}</p>
                                    <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5 line-clamp-1">{interview.job?.title || 'General'}</p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-bold text-zinc-900 whitespace-nowrap">{dateDisplay}</p>
                                  <p className={`text-[10px] font-extrabold uppercase tracking-wider mt-0.5 ${dayColor}`}>{relativeDay}</p>
                                </div>
                              </div>
                            );
                          })
                        )}

                        <button 
                          onClick={() => navigate('/employer/jobs')}
                          className="w-full mt-4 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs font-extrabold py-2.5 rounded-xl transition-colors shadow-sm inline-flex justify-center items-center gap-2"
                        >
                          View Full Schedule <ArrowUpRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </section>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;
