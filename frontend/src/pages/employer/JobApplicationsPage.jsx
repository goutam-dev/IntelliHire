import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { Download, FileText, Handshake, CalendarClock, CheckCircle2, XCircle, Users, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchEmployerProfile } from '../../store/slices/employerSlice';
import applicationApi from '../../services/api/applicationApi';
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

  const hasSelection = selectedIds.length > 0;

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
              />
            )}
          </div>
        </motion.div>

        <CandidateModal
          open={candidateOpen}
          onClose={() => setCandidateOpen(false)}
          application={selectedApplication}
        />
      </main>
    </div>
  );
};

export default JobApplicationsPage;