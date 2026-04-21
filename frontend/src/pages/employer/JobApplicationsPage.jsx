import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth, useClerk, useUser } from '@clerk/clerk-react';
import { Download, FileText, Handshake, CalendarClock, CheckCircle2, XCircle, Users, ChevronRight, Sparkles, RefreshCw, Zap, Award, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchEmployerProfile } from '../../store/slices/employerSlice';
import applicationApi from '../../services/api/applicationApi';
import jobApi from '../../services/api/jobApi';
import { batchAnalyzeApplications, analyzeResume } from '../../services/api/resumeRankingApi';
import FiltersBar from '../../components/FiltersBar';
import ApplicationsTable from '../../components/ApplicationsTable';
import CandidateModal from '../../components/CandidateModal';
import ApplicationDetailsModal from '../../components/ApplicationDetailsModal';
import InterviewReportModal from '../../components/InterviewReportModal';
import { ReInterviewApproveDialog, ReInterviewDenyDialog } from '../../components/employer/ReInterviewDialogs';

import EmployerHeader from '../../components/layout/EmployerHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';

const getLifecycleActions = (application) => {
  const status = application?.status;
  const hasCompletedInterview = Boolean(application?.interviewCompletedAt || status === 'Interviewed');
  const canReschedule =
    status === 'Interview Scheduled' &&
    !application?.interviewLocked &&
    Boolean(application?.interviewWindowEnd);

  if (status === 'Applied') return ['shortlist', 'reject'];
  if (status === 'Shortlisted') {
    return hasCompletedInterview ? ['accept', 'reject'] : ['interview', 'reject'];
  }
  if (status === 'Interview Scheduled') {
    return canReschedule ? ['reschedule', 'reject'] : ['reject'];
  }
  if (status === 'Interviewed') return ['finalist', 'accept', 'reject', 'shortlist'];
  if (status === 'Finalist') return ['accept', 'reject'];
  return [];
};

const getLocalDateTimeInputValue = (date = new Date()) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const getInitialInterviewStart = () => {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 30) * 30);
  d.setSeconds(0);
  d.setMilliseconds(0);
  const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

const INTERVIEW_START_GRACE_MS = 5 * 60 * 1000;

const normalizeInterviewDateTime = (value) => {
  if (!value) return value;
  const parts = value.split('T');
  if (parts.length === 2 && parts[1].indexOf('Z') === -1) {
    const [y, m, d] = parts[0].split('-').map(Number);
    const [h, min] = parts[1].split(':').map(Number);
    if (!Number.isNaN(y) && !Number.isNaN(h)) {
      const parsed = new Date(y, m - 1, d, h, min);
      return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
    }
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
};

const normalizeInterviewPayload = (payload = {}) => ({
  ...payload,
  interviewWindowStart: normalizeInterviewDateTime(payload.interviewWindowStart),
  interviewWindowEnd: normalizeInterviewDateTime(payload.interviewWindowEnd),
});

const StatCard = ({ title, value, icon: Icon, color, delay, isLoading }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="relative overflow-hidden bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm transition-all hover:shadow-md hover:border-zinc-300 hover:-translate-y-0.5 group"
  >
    {isLoading ? (
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <div className="h-4 w-20 bg-zinc-200 rounded animate-pulse"></div>
          <div className="h-8 w-12 bg-zinc-200 rounded animate-pulse"></div>
        </div>
        <div className={`p-2.5 rounded-xl bg-zinc-100 ring-1 ring-inset ring-zinc-200 h-10 w-10 animate-pulse`}>
        </div>
      </div>
    ) : (
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900 group-hover:text-zinc-700 transition-colors">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${color.bg} shadow-none ring-1 ring-inset ${color.ring}`}>
          <Icon className={`h-5 w-5 ${color.text}`} />
        </div>
      </div>
    )}
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
  const [jobContext, setJobContext] = useState({ title: '', department: '', status: '', closedAt: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [resumeGrade, setResumeGrade] = useState('all');
  const [sort, setSort] = useState('ai_score');

  const [selectedIds, setSelectedIds] = useState([]);
  const [candidateOpen, setCandidateOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  
  // Interview report modal state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReportData, setSelectedReportData] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const [analyzingBatch, setAnalyzingBatch] = useState(false);
  const [analyzingIds, setAnalyzingIds] = useState(new Set());
  const [batchProgress, setBatchProgress] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  // Dialog states
  const [batchAnalyzeDialog, setBatchAnalyzeDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [interviewDialog, setInterviewDialog] = useState(false);
  const [interviewData, setInterviewData] = useState({ startDate: getInitialInterviewStart(), endDate: '', instructions: '' });
  const [interviewFormError, setInterviewFormError] = useState('');

  // Re-interview dialog states
  const [reInterviewApproveOpen, setReInterviewApproveOpen] = useState(false);
  const [reInterviewDenyOpen, setReInterviewDenyOpen] = useState(false);
  const [reInterviewTargetApp, setReInterviewTargetApp] = useState(null);
  const [reInterviewLoading, setReInterviewLoading] = useState(false);

  const hasSelection = selectedIds.length > 0;

  const selectedApplications = useMemo(
    () => applications.filter((app) => selectedIds.includes(app._id)),
    [applications, selectedIds]
  );

  const getEligibleApplicationsForAction = (type) => {
    return selectedApplications.filter((app) => {
      const allowed = getLifecycleActions(app);
      if (type === 'interview') {
        return allowed.includes('interview') || allowed.includes('reschedule');
      }
      return allowed.includes(type);
    });
  };

  const bulkActionAvailability = useMemo(() => {
    const totalSelected = selectedApplications.length;
    if (!totalSelected) {
      return { shortlist: false, reject: false, interview: false, accept: false, finalist: false };
    }

    const shortlist = getEligibleApplicationsForAction('shortlist').length === totalSelected;
    const reject = getEligibleApplicationsForAction('reject').length === totalSelected;
    const interview = getEligibleApplicationsForAction('interview').length === totalSelected;
    const accept = getEligibleApplicationsForAction('accept').length === totalSelected;
    const finalist = getEligibleApplicationsForAction('finalist').length === totalSelected;

    return { shortlist, reject, interview, accept, finalist };
  }, [selectedApplications]);

  const bulkDisabledReason = useMemo(() => {
    if (!hasSelection) return '';

    const disabledActions = [];
    if (!bulkActionAvailability.shortlist) disabledActions.push('Shortlist');
    if (!bulkActionAvailability.reject) disabledActions.push('Reject');
    if (!bulkActionAvailability.interview) disabledActions.push('Schedule/Reschedule');
    if (!bulkActionAvailability.accept) disabledActions.push('Accept');
    if (!bulkActionAvailability.finalist) disabledActions.push('Finalist');

    if (disabledActions.length === 0) return '';

    return `Some actions are disabled for the selected candidates (${disabledActions.join(', ')}). Select candidates from the same lifecycle stage to enable those actions.`;
  }, [hasSelection, bulkActionAvailability]);

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

  useEffect(() => {
    let isMounted = true;

    const loadJobContext = async () => {
      try {
        const data = await jobApi.getJobById(jobId);
        const job = data?.data || data;
        if (!isMounted || !job) return;
        setJobContext({
          title: job.title || '',
          department: job.department || '',
          status: job.status || '',
          closedAt: job.closedAt || null,
        });
      } catch (err) {
        if (!isMounted) return;
        setJobContext({ title: '', department: '', status: '', closedAt: null });
      }
    };

    if (jobId) loadJobContext();

    return () => {
      isMounted = false;
    };
  }, [jobId]);

  const fetchIdRef = useRef(0);
  const foregroundFetchCountRef = useRef(0);

  const hasInitializedFiltersRef = useRef(false);

  const fetchApplications = async (silent = false) => {
    if (!silent) {
      foregroundFetchCountRef.current += 1;
      setLoading(true);
    }
    setError('');
    
    // Increment to track the latest request
    fetchIdRef.current += 1;
    const currentFetchId = fetchIdRef.current;

    try {
      const params = { status, sort, resumeGrade };
      const data = await applicationApi.getApplicationsByJob(jobId, params);
      
      // Prevent stale response overwrite if a newer request exists
      if (fetchIdRef.current !== currentFetchId) {
        return data;
      }
      
      setApplications(data);
      return data; // return fresh data so callers don't rely on stale closure
    } catch (err) {
      if (fetchIdRef.current !== currentFetchId) return [];
      console.error('Failed to fetch applications:', err.message);
      setApplications([]);
      setError('Failed to load applications. Please try again.');
      return [];
    } finally {
      if (!silent) {
        foregroundFetchCountRef.current = Math.max(0, foregroundFetchCountRef.current - 1);
        setLoading(foregroundFetchCountRef.current > 0);
      }
    }
  };

  // Debounce status, grade, sort
  useEffect(() => {
    if (!hasInitializedFiltersRef.current) {
      hasInitializedFiltersRef.current = true;
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      if (jobId) {
        fetchApplications(true); // silent fetch to prevent full screen flashes
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, resumeGrade, sort]);

  useEffect(() => {
    // initial fetch
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // Derive filtered applications instantly based on search text 
  const filteredApplications = useMemo(() => {
    if (!search || !search.trim()) return applications;
    
    const lower = search.toLowerCase();
    return applications.filter((app) => {
      const name = app?.candidate?.user?.fullName?.toLowerCase() || '';
      return name.includes(lower);
    });
  }, [applications, search]);

  // eslint-disable-next-line
  const applyFilters = () => fetchApplications();

  const refresh = () => fetchApplications();

  const validateInterviewWindow = (payload) => {
    const start = payload?.interviewWindowStart;
    const end = payload?.interviewWindowEnd;

    if (!start || !end) {
      return 'Interview start and end date/time are required.';
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return 'Please provide valid interview date/time values.';
    }

    if (startDate.getTime() < Date.now() - INTERVIEW_START_GRACE_MS) {
      return 'Interview start date/time cannot be in the past.';
    }

    if (endDate <= startDate) {
      return 'Interview end date/time must be after start date/time.';
    }

    return '';
  };

  const singleAction = async (id, type, payload = {}) => {
    try {
      const actionLabelMap = {
        shortlist: 'shortlisted',
        reject: 'rejected',
        accept: 'accepted',
        finalist: 'marked as finalist',
        interview: 'scheduled for interview',
        reschedule: 'interview rescheduled',
        'approve-reinterview': 're-interview approved',
        'deny-reinterview': 're-interview request denied',
      };

      if (type === 'interview' || type === 'reschedule') {
        const interviewPayload = normalizeInterviewPayload(payload);
        await applicationApi.scheduleInterview(id, {
          interviewWindowStart: interviewPayload.interviewWindowStart,
          interviewWindowEnd: interviewPayload.interviewWindowEnd,
          instructions: interviewPayload.instructions
        });
      } else if (type === 'approve-reinterview') {
        const interviewPayload = normalizeInterviewPayload(payload);
        await applicationApi.approveReInterview(id, {
          interviewWindowStart: interviewPayload.interviewWindowStart,
          interviewWindowEnd: interviewPayload.interviewWindowEnd,
          instructions: interviewPayload.instructions,
        });
      } else if (type === 'deny-reinterview') {
        await applicationApi.denyReInterview(id, {
          note: payload.note || '',
        });
      } else {
        const map = { shortlist: 'Shortlisted', reject: 'Rejected', accept: 'Hired', finalist: 'Finalist' };
        const status = map[type];
        await applicationApi.updateApplicationStatus(id, {
          status,
          feedback: payload.feedback
        });
      }
      toast.success(`Application ${actionLabelMap[type] || 'updated'} successfully.`);
      await refresh();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to update application status.');
    }
  };

  const handleViewReport = async (application) => {
    setLoadingReport(true);
    setCandidateOpen(false); // Close candidate modal first
    setDetailsOpen(false); // Close details modal too
    try {
      const reportData = await applicationApi.getInterviewReport(application._id);
      setSelectedReportData({
        ...reportData,
        candidateName: application?.candidate?.user?.fullName || 'Candidate',
        jobTitle: application?.job?.title || 'Position' // Added job title fallback
      });
      setReportModalOpen(true);
    } catch (err) {
      console.error('Failed to load report:', err);
      alert('Failed to load interview report. It may not be available yet.');
      setDetailsOpen(true); // Re-open if failed
    } finally {
      setLoadingReport(false);
    }
  };

  const bulkAction = async (type, payload = {}) => {
    try {
      const eligibleApplications = getEligibleApplicationsForAction(type);

      if (eligibleApplications.length !== selectedIds.length) {
        toast.info('Selected candidates are in different lifecycle stages. Please select candidates from the same eligible stage for this action.');
        return false;
      }

      if (type === 'interview') {
        const interviewPayload = normalizeInterviewPayload(payload);
        const validationError = validateInterviewWindow(interviewPayload);
        if (validationError) {
          setInterviewFormError(validationError);
          return false;
        }

        const results = await Promise.all(
          eligibleApplications.map(async (app) => {
            try {
              await applicationApi.scheduleInterview(app._id, {
                interviewWindowStart: interviewPayload.interviewWindowStart,
                interviewWindowEnd: interviewPayload.interviewWindowEnd,
                instructions: interviewPayload.instructions || ''
              });
              return { ok: true };
            } catch (err) {
              return { ok: false, error: err };
            }
          })
        );

        const successCount = results.filter((r) => r.ok).length;
        const failedCount = results.length - successCount;
        if (failedCount === 0) {
          toast.success(`Interview schedule updated for ${successCount} candidate(s).`);
        } else if (successCount > 0) {
          toast.warn(`Interview action finished: ${successCount} updated, ${failedCount} failed.`);
        } else {
          toast.error(`Interview action failed for all selected candidates (${failedCount} failed).`);
        }

        setSelectedIds([]);
        await refresh();
        return successCount > 0;
      } else {
        const statusMap = { shortlist: 'Shortlisted', reject: 'Rejected', accept: 'Hired', finalist: 'Finalist' };
        const targetStatus = statusMap[type];

        const results = await Promise.all(
          eligibleApplications.map(async (app) => {
            try {
              await applicationApi.updateApplicationStatus(app._id, {
                status: targetStatus,
                feedback: payload.feedback,
                notes: payload.notes,
              });
              return { ok: true };
            } catch (err) {
              return { ok: false, error: err };
            }
          })
        );

        const successCount = results.filter((r) => r.ok).length;
        const failedCount = results.length - successCount;
        const actionLabel = `${type.charAt(0).toUpperCase() + type.slice(1)}`;

        if (failedCount === 0) {
          toast.success(`${actionLabel} completed for ${successCount} candidate(s).`);
        } else if (successCount > 0) {
          toast.warn(`${actionLabel} finished: ${successCount} updated, ${failedCount} failed.`);
        } else {
          toast.error(`${actionLabel} failed for all selected candidates (${failedCount} failed).`);
        }

        setSelectedIds([]);
        await refresh();
        return successCount > 0;
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Bulk action failed');
      return false;
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
    const interviewed = applications.filter(a => ['Interview Scheduled', 'Interviewed'].includes(a.status)).length;
    const finalist = applications.filter(a => a.status === 'Finalist').length;
    const accepted = applications.filter(a => a.status === 'Hired').length;
    const rejected = applications.filter(a => a.status === 'Rejected').length;
    return { total, shortlisted, interviewed, finalist, accepted, rejected };
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
    setBatchAnalyzeDialog(true);
  };

  const confirmBatchAnalyze = async () => {
    setBatchAnalyzeDialog(false);

    setAnalyzingBatch(true);
    setBatchProgress({ current: 0, total: applications.length, status: 'Starting...' });

    try {
      const result = await batchAnalyzeApplications(jobId);
      const totalApps = result.data?.totalApplications || applications.length;

      setBatchProgress({ current: 0, total: totalApps, status: 'Analyzing resumes...' });

      // Start polling for progress
      const interval = setInterval(async () => {
        try {
          // Use fresh data returned from fetchApplications instead of stale closure
          const freshApps = await fetchApplications(true); // silent = no loading spinner

          // Count how many have been analyzed using fresh data
          const analyzed = (freshApps || []).filter(app => app.aiScore != null).length;
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

      // Auto-refresh to show updated score — use returned fresh data (not stale closure)
      const refreshInterval = setInterval(async () => {
        const freshApps = await fetchApplications(true); // silent = no loading spinner
        const app = (freshApps || []).find(a => a._id === applicationId);
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
        className="inline-flex items-center gap-1 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm hover:bg-blue-700 shadow-sm hover:shadow transition-all disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed"
        disabled={!hasSelection || !bulkActionAvailability.shortlist}
      >
        <CheckCircle2 className="h-4 w-4" /> Shortlist
      </button>
      <button
        onClick={() => setRejectDialog(true)}
        className="inline-flex items-center gap-1 rounded-lg bg-rose-600 text-white px-3 py-2 text-sm hover:bg-rose-700 shadow-sm hover:shadow transition-all disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed"
        disabled={!hasSelection || !bulkActionAvailability.reject}
      >
        <XCircle className="h-4 w-4" /> Reject
      </button>
      <button
        onClick={() => {
          setInterviewFormError('');
          setInterviewDialog(true);
        }}
        className="inline-flex items-center gap-1 rounded-lg bg-amber-600 text-white px-3 py-2 text-sm hover:bg-amber-700 shadow-sm hover:shadow transition-all disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed"
        disabled={!hasSelection || !bulkActionAvailability.interview}
      >
        <CalendarClock className="h-4 w-4" /> Schedule/Reschedule
      </button>
      <button
        onClick={() => bulkAction('finalist')}
        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 text-white px-3 py-2 text-sm hover:bg-indigo-700 shadow-sm hover:shadow transition-all disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed"
        disabled={!hasSelection || !bulkActionAvailability.finalist}
      >
        <Award className="h-4 w-4" /> Finalist
      </button>
      <button
        onClick={() => bulkAction('accept')}
        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm hover:bg-emerald-700 shadow-sm hover:shadow transition-all disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:cursor-not-allowed"
        disabled={!hasSelection || !bulkActionAvailability.accept}
      >
        <Handshake className="h-4 w-4" /> Accept
      </button>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <button
          onClick={handleBatchAnalyze}
          disabled={analyzingBatch || applications.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-700"
        >
          {analyzingBatch ? (
            <>
              <RefreshCw className="h-4 w-4 text-indigo-200 animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 text-indigo-200" /> AI Analyze All
            </>
          )}
        </button>
        <button onClick={exportCSV} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 shadow-sm transition-colors hover:bg-emerald-100 hover:text-emerald-800">
          <Download className="h-4 w-4 text-emerald-600" /> Export CSV
        </button>
        <button onClick={exportPDF} className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 shadow-sm transition-colors hover:bg-rose-100 hover:text-rose-800">
          <FileText className="h-4 w-4 text-rose-600" /> Export PDF
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <EmployerHeader
        userName={user?.fullName || employerProfile?.user?.fullName || 'User'}
        companyName={employerProfile?.companyName || 'Company'}
        userImage={user?.imageUrl}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 space-y-6">
        {/* Breadcrumbs & Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-zinc-500 px-2">
            <Link to="/employer/jobs" className="hover:text-zinc-800 transition-colors font-medium">Jobs</Link>
            <ChevronRight className="h-4 w-4 text-zinc-400" />
            <span className="text-zinc-900 font-bold">Applications</span>
          </div>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between rounded-3xl bg-zinc-900 p-6 md:p-8 shadow-md border border-zinc-800 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-zinc-800/40 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Job Applications</h1>
              <p className="mt-1.5 text-sm font-medium text-zinc-400">Manage and track candidates for this position.</p>
            </div>
            <div className="flex flex-col sm:items-end sm:text-right relative z-10">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Current Role</p>
              <p className="mt-1 text-lg font-bold text-white">{jobContext.title || `Job #${jobId}`}</p>
              <p className="text-sm font-medium text-zinc-400 flex items-center gap-1.5 mt-1 sm:justify-end">
                <FileText className="h-4 w-4 text-zinc-500" />
                {jobContext.department || 'Department not specified'}
              </p>
            </div>
          </div>
        </div>

        {jobContext.status === 'closed' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
            <span>
              This job is currently closed{jobContext.closedAt ? ` (since ${new Date(jobContext.closedAt).toLocaleDateString()})` : ''}. Candidate pipeline statuses remain unchanged.
            </span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total"
            value={stats.total}
            icon={Users}
            color={{ bg: 'bg-zinc-50', text: 'text-zinc-600', ring: 'ring-zinc-200' }}
            delay={0}
            isLoading={loading}
          />
          <StatCard
            title="Shortlisted"
            value={stats.shortlisted}
            icon={CheckCircle2}
            color={{ bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'ring-indigo-200' }}
            delay={0.1}
            isLoading={loading}
          />
          <StatCard
            title="Interviews"
            value={stats.interviewed}
            icon={CalendarClock}
            color={{ bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-200' }}
            delay={0.2}
            isLoading={loading}
          />
          <StatCard
            title="Finalist"
            value={stats.finalist}
            icon={Award}
            color={{ bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-200' }}
            delay={0.3}
            isLoading={loading}
          />
          <StatCard
            title="Accepted"
            value={stats.accepted}
            icon={Handshake}
            color={{ bg: 'bg-teal-50', text: 'text-teal-600', ring: 'ring-teal-200' }}
            delay={0.4}
            isLoading={loading}
          />
          <StatCard
            title="Rejected"
            value={stats.rejected}
            icon={XCircle}
            color={{ bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-200' }}
            delay={0.5}
            isLoading={loading}
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
            resumeGrade={resumeGrade}
            setResumeGrade={setResumeGrade}
            sort={sort}
            setSort={setSort}
          />

          <AnimatePresence>
            {hasSelection && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
              >
                {bulkBar}
                {bulkDisabledReason && (
                  <p className="mt-3 text-xs font-medium text-amber-600">{bulkDisabledReason}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-visible">
            {loading && (
              <div className="p-12 flex justify-center items-center text-zinc-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
                Loading applications...
              </div>
            )}

            {error && (
              <div className="p-4 bg-rose-50 text-rose-700 border-b border-rose-100 flex items-center gap-2 rounded-t-3xl">
                <div className="h-2 w-2 rounded-full bg-rose-500" />
                {error}
              </div>
            )}

            {!loading && (
              <ApplicationsTable
                applications={filteredApplications}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                onSingleAction={singleAction}
                onCandidateClick={(app) => { setSelectedApplication(app); setCandidateOpen(true); }}
                onDetailsClick={(app) => { setSelectedApplication(app); setDetailsOpen(true); }}
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
        />

        <ApplicationDetailsModal
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          application={selectedApplication}
          onAnalyze={handleAnalyzeSingle}
          analyzingIds={analyzingIds}
          onViewInterviewReport={handleViewReport}
          onApproveReInterview={(app) => {
            setDetailsOpen(false);
            setReInterviewTargetApp(app);
            setReInterviewApproveOpen(true);
          }}
          onDenyReInterview={(app) => {
            setDetailsOpen(false);
            setReInterviewTargetApp(app);
            setReInterviewDenyOpen(true);
          }}
        />

        {/* Re-Interview Approve Dialog (from CandidateModal) */}
        <ReInterviewApproveDialog
          open={reInterviewApproveOpen}
          onClose={() => { setReInterviewApproveOpen(false); setReInterviewTargetApp(null); }}
          application={reInterviewTargetApp}
          loading={reInterviewLoading}
          onApprove={async (payload) => {
            if (!reInterviewTargetApp) return;
            setReInterviewLoading(true);
            try {
              await singleAction(reInterviewTargetApp._id, 'approve-reinterview', payload);
              setReInterviewApproveOpen(false);
              setReInterviewTargetApp(null);
            } finally {
              setReInterviewLoading(false);
            }
          }}
        />

        {/* Re-Interview Deny Dialog (from CandidateModal) */}
        <ReInterviewDenyDialog
          open={reInterviewDenyOpen}
          onClose={() => { setReInterviewDenyOpen(false); setReInterviewTargetApp(null); }}
          application={reInterviewTargetApp}
          loading={reInterviewLoading}
          onDeny={async (payload) => {
            if (!reInterviewTargetApp) return;
            setReInterviewLoading(true);
            try {
              await singleAction(reInterviewTargetApp._id, 'deny-reinterview', payload);
              setReInterviewDenyOpen(false);
              setReInterviewTargetApp(null);
            } finally {
              setReInterviewLoading(false);
            }
          }}
        />

        {/* Global Loading Overlay for Reports */}
        {loadingReport && (
          <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
            <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
            <p className="text-lg font-semibold text-slate-800">Loading Report...</p>
            <p className="text-sm text-slate-500 mt-2">Retrieving AI interview analysis and proctoring data.</p>
          </div>
        )}

        <InterviewReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          report={selectedReportData}
          candidateName={selectedReportData?.candidateName}
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
        </AnimatePresence>

        {/* Batch Analyze Confirmation Dialog */}
        <ConfirmDialog
          open={batchAnalyzeDialog}
          title="AI Batch Analysis"
          message={`This will analyze all ${applications.length} applications using AI. This may take a few minutes.`}
          confirmLabel="Start Analysis"
          cancelLabel="Cancel"
          variant="info"
          onConfirm={confirmBatchAnalyze}
          onCancel={() => setBatchAnalyzeDialog(false)}
        />

        {/* Bulk Reject Dialog */}
        <ConfirmDialog
          open={rejectDialog}
          title="Reject Selected Candidates"
          message={`You are about to reject ${selectedIds.length} candidate(s). Optionally provide feedback below.`}
          confirmLabel="Reject"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={() => {
            bulkAction('reject', { feedback: rejectFeedback });
            setRejectDialog(false);
            setRejectFeedback('');
          }}
          onCancel={() => { setRejectDialog(false); setRejectFeedback(''); }}
        >
          <textarea
            value={rejectFeedback}
            onChange={(e) => setRejectFeedback(e.target.value)}
            placeholder="Optional feedback for the candidates..."
            className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
            rows={3}
          />
        </ConfirmDialog>

        {/* Bulk Interview Dialog */}
        <ConfirmDialog
          open={interviewDialog}
          title="Schedule Interviews"
          message={`Schedule or reschedule interviews for ${selectedIds.length} candidate(s).`}
          confirmLabel="Schedule"
          cancelLabel="Cancel"
          variant="info"
          onConfirm={async () => {
            const payload = {
              interviewWindowStart: interviewData.startDate,
              interviewWindowEnd: interviewData.endDate,
              instructions: interviewData.instructions,
            };

            const validationError = validateInterviewWindow(payload);
            if (validationError) {
              setInterviewFormError(validationError);
              return;
            }

            const success = await bulkAction('interview', payload);
            if (success) {
              setInterviewDialog(false);
              setInterviewFormError('');
              setInterviewData({ startDate: getInitialInterviewStart(), endDate: '', instructions: '' });
            }
          }}
          onCancel={() => {
            setInterviewDialog(false);
            setInterviewFormError('');
            setInterviewData({ startDate: getInitialInterviewStart(), endDate: '', instructions: '' });
          }}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Interview Start</label>
              <input
                type="datetime-local"
                value={interviewData.startDate}
                onChange={(e) => {
                  setInterviewFormError('');
                  setInterviewData(prev => ({ ...prev, startDate: e.target.value }));
                }}
                min={getLocalDateTimeInputValue()}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Interview End</label>
              <input
                type="datetime-local"
                value={interviewData.endDate}
                onChange={(e) => {
                  setInterviewFormError('');
                  setInterviewData(prev => ({ ...prev, endDate: e.target.value }));
                }}
                min={interviewData.startDate || getLocalDateTimeInputValue()}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Instructions</label>
              <textarea
                value={interviewData.instructions}
                onChange={(e) => {
                  setInterviewFormError('');
                  setInterviewData(prev => ({ ...prev, instructions: e.target.value }));
                }}
                placeholder="Interview instructions for the candidates..."
                className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
            {interviewFormError && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {interviewFormError}
              </p>
            )}
          </div>
        </ConfirmDialog>
      </main>
    </div>
  );
};

export default JobApplicationsPage;
