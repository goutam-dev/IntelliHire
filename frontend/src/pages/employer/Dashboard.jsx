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
  Handshake
} from 'lucide-react';
import { motion } from 'framer-motion';
import EmployerHeader from '../../components/layout/EmployerHeader';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchEmployerJobs } from '../../store/slices/jobSlice';
import { fetchEmployerProfile } from '../../store/slices/employerSlice';
import { useAuth, useClerk } from '@clerk/clerk-react';

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

const StatCard = ({ label, value, subtext, color = "bg-blue-500" }) => (
  <motion.div
    variants={itemVariants}
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
    className="group relative flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:shadow-md overflow-hidden"
  >
    <div className={`absolute top-0 left-0 h-full w-1 ${color} opacity-80`} />
    <div className="relative z-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-4xl font-light text-slate-900 tracking-tight">{value}</h3>
      </div>
    </div>
    {subtext && (
      <div className="mt-4 flex items-center gap-2">
        <div className={`h-1.5 w-1.5 rounded-full ${color}`} />
        <p className="text-xs font-medium text-slate-500">
          {subtext}
        </p>
      </div>
    )}

    {/* Decorative background element */}
    <div className={`absolute -right-6 -bottom-6 h-24 w-24 rounded-full ${color} opacity-5 blur-2xl transition-opacity group-hover:opacity-10`} />
  </motion.div>
);

const ActionButton = ({ icon: Icon, label, onClick, primary = false }) => (
  <motion.button
    whileHover={{ y: -1 }}
    whileTap={{ y: 0 }}
    onClick={onClick}
    className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all
      ${primary
        ? 'bg-slate-900 text-white shadow-md hover:bg-slate-800 hover:shadow-lg'
        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900'
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
  const { jobs, jobsLoading } = useAppSelector((state) => state.job);
  const { profile, loading: profileLoading } = useAppSelector((state) => state.employer);

  const [stats, setStats] = useState({
    activeJobs: 0,
    draftJobs: 0,
    closedJobs: 0,
    archivedJobs: 0,
    totalJobs: 0,
    totalApplications: 0,
    newApplications: 0
  });
  const [recentApplications, setRecentApplications] = useState([]);
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
          newApplications: data.newApplications
        });
        setRecentApplications(data.recentApplications || []);
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
  const firstName = profile?.user?.fullName?.split(' ')[0] || 'Employer';

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
    <div className="min-h-screen bg-[#FAFAFA] text-slate-900 font-sans selection:bg-slate-100 selection:text-slate-900">
      <EmployerHeader 
        userName={profile?.user?.fullName}
        companyName={profile?.companyName}
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
            <div className="space-y-1">
              <motion.p variants={itemVariants} className="text-sm font-medium uppercase tracking-widest text-slate-400">
                Overview
              </motion.p>
              <motion.h1 variants={itemVariants} className="text-3xl font-light tracking-tight text-slate-900 sm:text-4xl">
                {getGreeting()}, <span className="font-medium">{firstName}</span>
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <StatCard
              label="Active Jobs"
              value={stats.activeJobs}
              subtext={`${stats.totalJobs} total jobs posted`}
              color="bg-emerald-500"
            />
            <StatCard
              label="Total Candidates"
              value={stats.totalApplications}
              subtext="Across all active listings"
              color="bg-blue-500"
            />
            <StatCard
              label="New Applications"
              value={stats.newApplications}
              subtext="Received in the last 24 hours"
              color="bg-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
            {/* Main Content Column */}
            <div className="lg:col-span-2 space-y-10">

              {/* Recent Jobs Section */}
              <section>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-medium text-slate-900">Recent Postings</h2>
                  <button
                    onClick={() => navigate('/employer/jobs')}
                    className="group flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900"
                  >
                    View all <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {jobsLoading ? (
                    <div className="col-span-full py-12 text-center text-sm text-slate-400 font-light">Loading...</div>
                  ) : recentJobs.length === 0 ? (
                    <div className="col-span-full rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                      <p className="text-sm text-slate-500">No jobs posted yet.</p>
                      <button onClick={() => navigate('/employer/jobs/create')} className="mt-2 text-sm font-medium text-slate-900 underline underline-offset-4">Create your first job</button>
                    </div>
                  ) : (
                    recentJobs.map((job) => (
                      <div
                        key={job._id}
                        onClick={() => navigate(`/employer/jobs/${job._id}/applications`)}
                        className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-slate-200 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition-colors group-hover:bg-slate-900 group-hover:text-white">
                            <Briefcase className="h-5 w-5" />
                          </div>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide
                            ${job.status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                              job.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                                'bg-rose-50 text-rose-700'}`}>
                            {job.status}
                          </span>
                        </div>

                        <div className="mt-4">
                          <h3 className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{job.title}</h3>
                          <p className="mt-1 text-sm text-slate-500 font-light">{job.department || 'General'}</p>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                          <span className="font-medium text-slate-600 group-hover:text-slate-900">
                            {job.applicationsCount || 0} Applicants
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Recent Applications Section */}
              <section>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-medium text-slate-900">Latest Candidates</h2>
                </div>

                <div className="rounded-xl border border-slate-100 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                  {loading ? (
                    <div className="py-12 text-center text-sm text-slate-400 font-light">Loading...</div>
                  ) : recentApplications.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-400 font-light">No recent applications found.</div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {recentApplications.map((app) => (
                        <div
                          key={app._id}
                          className="flex items-center justify-between p-5 transition-colors hover:bg-slate-50/50"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-medium text-slate-600">
                              {app?.candidate?.user?.fullName?.charAt(0) || 'C'}
                            </div>
                            <div>
                              <h3 className="text-sm font-medium text-slate-900">{app?.candidate?.user?.fullName || 'Candidate'}</h3>
                              <p className="text-xs text-slate-500 font-light">Applied for <span className="text-slate-700 font-medium">{app?.job?.title}</span></p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-slate-400 font-light">
                              {getApplicationDate(app)}
                            </span>
                            <button
                              onClick={() => navigate(`/employer/jobs/${app?.job?._id}/applications`)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
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
            <div className="space-y-8">
              <motion.div variants={itemVariants} className="rounded-xl bg-slate-900 p-6 text-white shadow-lg">
                <h3 className="text-lg font-light">Quick Actions</h3>
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => navigate('/employer/jobs/create')}
                    className="flex w-full items-center justify-between rounded-lg bg-white/10 px-4 py-3 text-sm font-medium transition-colors hover:bg-white/20"
                  >
                    <span>Post a Job</span>
                    <Plus className="h-4 w-4 opacity-70" />
                  </button>
                  <button
                    onClick={() => navigate('/employer/jobs')}
                    className="flex w-full items-center justify-between rounded-lg bg-white/10 px-4 py-3 text-sm font-medium transition-colors hover:bg-white/20"
                  >
                    <span>Manage Listings</span>
                    <Briefcase className="h-4 w-4 opacity-70" />
                  </button>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-medium text-slate-900">Job Status Overview</h3>
                <div className="mt-6 space-y-6">
                  {[
                    { label: 'Active', value: stats.activeJobs, total: stats.totalJobs, color: 'bg-emerald-500' },
                    { label: 'Drafts', value: stats.draftJobs, total: stats.totalJobs, color: 'bg-slate-300' },
                    ...(stats.closedJobs > 0 ? [{ label: 'Closed', value: stats.closedJobs, total: stats.totalJobs, color: 'bg-rose-500' }] : []),
                    ...(stats.archivedJobs > 0 ? [{ label: 'Archived', value: stats.archivedJobs, total: stats.totalJobs, color: 'bg-slate-400' }] : []),
                  ].map((item) => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">{item.label}</span>
                        <span className="font-medium text-slate-900">{Math.round((item.value / (item.total || 1)) * 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100">
                        <div
                          className={`h-1.5 rounded-full ${item.color}`}
                          style={{ width: `${(item.value / (item.total || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Dashboard;