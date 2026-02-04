import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { Download, FileText, Handshake, CalendarClock, CheckCircle2, XCircle, Users, ChevronRight, Sparkles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchEmployerProfile } from '../../store/slices/employerSlice';
import applicationApi from '../../services/api/applicationApi';
import { batchAnalyzeApplications, analyzeResume } from '../../services/api/resumeRankingApi';
import FiltersBar from '../../components/FiltersBar';
import ApplicationsTable from '../../components/ApplicationsTable';
import CandidateModal from '../../components/CandidateModal';
import { mockApplications } from '../../data/mockApplications';
import EmployerHeader from '../../components/layout/EmployerHeader';

const StatCard = ({ title, value, icon: Icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </div>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
    </div>
  </motion.div>
);

const JobApplicationsPage = () => {
  const { jobId } = useParams();
  const dispatch = useAppDispatch();
  const { profile: employerProfile } = useAppSelector((state) => state.employer);
  const { getToken } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');

  const [selectedIds, setSelectedIds] = useState([]);
  const [candidateOpen, setCandidateOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [analyzingBatch, setAnalyzingBatch] = useState(false);
  const [analyzingIds, setAnalyzingIds] = useState(new Set());
  const [batchProgress, setBatchProgress] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  const hasSelection = selectedIds.length > 0;

  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  useEffect(() => {
    const loadProfile = async () => {
      const token = await getToken();
      dispatch(fetchEmployerProfile({ token }));
    };
    loadProfile();
  }, [dispatch, getToken]);

  const fetchApplications = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { status, search, sort };
      const data = await applicationApi.getApplicationsByJob(jobId, params);
      setApplications(data);
    } catch (err) {
      console.warn('Falling back to mock applications:', err.message);
      // Fallback to mock data for local development
      setApplications(mockApplications);
      setError('Showing mock data due to API error.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const applyFilters = () => fetchApplications();

  const refresh = () => fetchApplications();

  const singleAction = async (id, type, payload = {}) => {
    try {
      if (type === 'interview') {
        await applicationApi.scheduleInterview(id, {
          scheduledAt: payload.scheduledAt,
          instructions: payload.instructions
        });
      } else {
        const map = { shortlist: 'Shortlisted', reject: 'Rejected', accept: 'Hired' };
        const status = map[type];
        await applicationApi.updateApplicationStatus(id, {
          status,
          feedback: payload.feedback
        });
      }
      refresh();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Action failed');
    }
  };

  const bulkAction = async (type, payload = {}) => {
    try {
      const map = { shortlist: 'Shortlisted', reject: 'Rejected', accept: 'Hired', interview: 'Interview Scheduled' };
      const status = map[type];
      
      await applicationApi.bulkUpdateApplicationStatus(selectedIds, {
        status,
        feedback: payload.feedback,
        notes: payload.notes
      });
      
      setSelectedIds([]);
      refresh();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Bulk action failed');
    }
  };

  const exportCSV = () => {
    const headers = ['Candidate', 'Email', 'Phone', 'Applied', 'Status'];
    const rows = applications.map((app) => [
      app?.candidate?.user?.fullName || '',
      app?.candidate?.user?.email || '',
      app?.candidate?.user?.phoneNumber || '',
      app.createdAt ? new Date(app.createdAt).toISOString() : '',
      app.status || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${(v ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications_${jobId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const win = window.open('', '_blank');
    if (!win) return alert('Popup blocked');
    const rows = applications
      .map((app) => (
        `<tr>
          <td style="padding:8px;border:1px solid #e5e7eb;">${app?.candidate?.user?.fullName || ''}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${app?.candidate?.user?.email || ''}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${app?.candidate?.user?.phoneNumber || ''}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${app.createdAt ? new Date(app.createdAt).toLocaleDateString() : ''}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${app.status || ''}</td>
        </tr>`
      )).join('');
    win.document.write(`<!doctype html><title>Applications</title><body>
      <h2>Applications for job ${jobId}</h2>
      <table style="border-collapse:collapse;width:100%;font-family:system-ui;font-size:12px;">
        <thead>
          <tr>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Candidate</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Email</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Phone</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Applied</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <script>window.print();</script>
    </body>`);
  };

  const stats = useMemo(() => {
    const total = applications.length;
    const shortlisted = applications.filter(a => a.status === 'Shortlisted').length;
    const interviewed = applications.filter(a => a.status === 'Interview Scheduled').length;
    const accepted = applications.filter(a => a.status === 'Hired').length;
    const rejected = applications.filter(a => a.status === 'Rejected').length;
    return { total, shortlisted, interviewed, accepted, rejected };
  }, [applications]);

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleBatchAnalyze = async () => {
    if (analyzingBatch) return;
    
    const confirmed = window.confirm(
      `This will analyze all ${applications.length} applications using AI. This may take a few minutes. Continue?`
    );
    
    if (!confirmed) return;
    
    setAnalyzingBatch(true);
    setBatchProgress({ current: 0, total: applications.length, status: 'Starting...' });
    
    try {
      const result = await batchAnalyzeApplications(jobId);
      const totalApps = result.data?.totalApplications || applications.length;
      
      setBatchProgress({ current: 0, total: totalApps, status: 'Analyzing resumes...' });
      
      // Start polling for progress
      const interval = setInterval(async () => {
        try {
          await refresh();
          
          // Count how many have been analyzed
          const analyzed = applications.filter(app => app.aiScore != null).length;
          setBatchProgress(prev => ({
            ...prev,
            current: analyzed,
            status: analyzed >= totalApps ? 'Complete!' : 'Analyzing resumes...'
          }));
          
          // Stop polling when all are analyzed
          if (analyzed >= totalApps) {
            clearInterval(interval);
            setPollingInterval(null);
            setTimeout(() => {
              setAnalyzingBatch(false);
              setBatchProgress(null);
            }, 2000);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 3000); // Poll every 3 seconds
      
      setPollingInterval(interval);
      
    } catch (err) {
      console.error('Batch analysis error:', err);
      alert('Failed to analyze applications: ' + (err.message || 'Unknown error'));
      setAnalyzingBatch(false);
      setBatchProgress(null);
    }
  };

  const handleAnalyzeSingle = async (applicationId) => {
    setAnalyzingIds(prev => new Set(prev).add(applicationId));
    try {
      await analyzeResume(applicationId);
      
      // Auto-refresh to show updated score
      const refreshInterval = setInterval(async () => {
        await refresh();
        const app = applications.find(a => a._id === applicationId);
        if (app?.aiScore != null) {
          clearInterval(refreshInterval);
          setAnalyzingIds(prev => {
            const next = new Set(prev);
            next.delete(applicationId);
            return next;
          });
        }
      }, 2000);
      
      // Timeout after 60 seconds
      setTimeout(() => {
        clearInterval(refreshInterval);
        setAnalyzingIds(prev => {
          const next = new Set(prev);
          next.delete(applicationId);
          return next;
        });
      }, 60000);
      
    } catch (err) {
      console.error('Analysis error:', err);
      alert('Failed to analyze resume. Please try again.');
      setAnalyzingIds(prev => {
        const next = new Set(prev);
        next.delete(applicationId);
        return next;
      });
    }
  };

  const bulkBar = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-2"
    >
      <button
        onClick={() => bulkAction('shortlist')}
        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm hover:bg-blue-700 shadow-sm hover:shadow transition-all"
        disabled={!hasSelection}
      >
        <CheckCircle2 className="h-4 w-4" /> Shortlist
      </button>
      <button
        onClick={() => {
          const feedback = prompt('Optional feedback for rejection:');
          bulkAction('reject', { feedback });
        }}
        className="inline-flex items-center gap-1 rounded-lg bg-rose-600 text-white px-3 py-2 text-sm hover:bg-rose-700 shadow-sm hover:shadow transition-all"
        disabled={!hasSelection}
      >
        <XCircle className="h-4 w-4" /> Reject
      </button>
      <button
        onClick={() => {
          const scheduledAt = prompt('Interview date (YYYY-MM-DDTHH:mm):');
          const instructions = prompt('Interview instructions:');
          bulkAction('interview', { notes: instructions, feedback: '', scheduledAt });
        }}
        className="inline-flex items-center gap-1 rounded-lg bg-amber-600 text-white px-3 py-2 text-sm hover:bg-amber-700 shadow-sm hover:shadow transition-all"
        disabled={!hasSelection}
      >
        <CalendarClock className="h-4 w-4" /> Interview
      </button>
      <button
        onClick={() => bulkAction('accept')}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm hover:bg-emerald-700 shadow-sm hover:shadow transition-all"
        disabled={!hasSelection}
      >
        <Handshake className="h-4 w-4" /> Accept
      </button>
      <div className="ml-auto flex items-center gap-2">
        <button 
          onClick={handleBatchAnalyze}
          disabled={analyzingBatch || applications.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-violet-300 bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-2 text-sm font-semibold text-violet-700 hover:border-violet-400 hover:from-violet-100 hover:to-purple-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {analyzingBatch ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> AI Analyze All
            </>
          )}
        </button>
        <button onClick={exportCSV} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 transition-colors">
          <Download className="h-4 w-4" /> Export CSV
        </button>
        <button onClick={exportPDF} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50 transition-colors">
          <FileText className="h-4 w-4" /> Export PDF
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <EmployerHeader 
        userName={user?.fullName || employerProfile?.user?.fullName || 'User'}
        companyName={employerProfile?.companyName || 'Company'}
        userImage={user?.imageUrl}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Breadcrumbs & Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link to="/employer/jobs" className="hover:text-blue-600 transition-colors">Jobs</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-900 font-medium">Applications</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Job Applications</h1>
              <p className="text-slate-600">Manage and track candidates for this position.</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Applications"
            value={stats.total}
            icon={Users}
            color="bg-slate-500"
            delay={0}
          />
          <StatCard
            title="Shortlisted"
            value={stats.shortlisted}
            icon={CheckCircle2}
            color="bg-blue-500"
            delay={0.1}
          />
          <StatCard
            title="Interviews"
            value={stats.interviewed}
            icon={CalendarClock}
            color="bg-amber-500"
            delay={0.2}
          />
          <StatCard
            title="Accepted"
            value={stats.accepted}
            icon={Handshake}
            color="bg-emerald-500"
            delay={0.3}
          />
          <StatCard
            title="Rejected"
            value={stats.rejected}
            icon={XCircle}
            color="bg-rose-500"
            delay={0.4}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <FiltersBar
            search={search}
            setSearch={setSearch}
            status={status}
            setStatus={setStatus}
            sort={sort}
            setSort={setSort}
            onApply={applyFilters}
          />

          <AnimatePresence>
            {hasSelection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                {bulkBar}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-visible">
            {loading && (
              <div className="p-12 flex justify-center items-center text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                Loading applications...
              </div>
            )}

            {error && (
              <div className="p-4 bg-amber-50 text-amber-700 border-b border-amber-100 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                {error}
              </div>
            )}

            {!loading && (
              <ApplicationsTable
                applications={applications}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                onSingleAction={singleAction}
                onCandidateClick={(app) => { setSelectedApplication(app); setCandidateOpen(true); }}
                onAnalyze={handleAnalyzeSingle}
                analyzingIds={analyzingIds}
              />
            )}
          </div>
        </motion.div>

        <CandidateModal
          open={candidateOpen}
          onClose={() => setCandidateOpen(false)}
          application={selectedApplication}
          onAnalyze={handleAnalyzeSingle}
          analyzingIds={analyzingIds}
        />
        {/* Batch Analysis Progress Modal */}
        <AnimatePresence>
          {batchProgress && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-violet-100"
              >
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 mb-4">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">AI Analysis in Progress</h3>
                  <p className="text-sm text-slate-600 mb-6">{batchProgress.status}</p>
                  
                  {/* Progress Bar */}
                  <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden mb-3">
                    <motion.div
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-500 to-purple-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </div>
                  
                  {/* Progress Text */}
                  <div className="flex justify-between items-center text-sm mb-4">
                    <span className="text-slate-600">
                      {batchProgress.current} of {batchProgress.total} analyzed
                    </span>
                    <span className="font-semibold text-violet-600">
                      {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                    </span>
                  </div>
                  
                  {/* Spinner */}
                  {batchProgress.current < batchProgress.total && (
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span className="text-xs">This may take a few minutes...</span>
                    </div>
                  )}
                  
                  {/* Success Message */}
                  {batchProgress.current >= batchProgress.total && (
                    <div className="flex items-center justify-center gap-2 text-emerald-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-semibold">Analysis Complete!</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>      </main>
    </div>
  );
};

export default JobApplicationsPage;