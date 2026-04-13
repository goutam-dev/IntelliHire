import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Plus,
  Users,
  FileText,
  Edit3,
  XCircle,
  RefreshCcw,
  Trash2,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useAuth } from '@clerk/clerk-react';
import {
  fetchEmployerJobs,
  updateJobStatus,
  deleteJob,
} from '../store/slices/jobSlice';
import { fetchEmployerProfile } from '../store/slices/employerSlice';
import EmployerHeader from '../components/layout/EmployerHeader';
import TopCandidatesDashboard from '../components/employer/TopCandidatesDashboard';
import ConfirmDialog from '../components/common/ConfirmDialog';

const statusFilters = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Closed', value: 'closed' },
  { label: 'Draft', value: 'draft' },
  { label: 'Archived', value: 'archived' },
];

const sortOptions = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
  { label: 'Most Applications', value: 'applications' },
  { label: 'Most Views', value: 'views' },
  { label: 'Title (A-Z)', value: 'title-asc' },
  { label: 'Title (Z-A)', value: 'title-desc' },
];

const StatusBadge = ({ status }) => {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    closed: 'bg-orange-50 text-orange-700 border border-orange-100',
    draft: 'bg-slate-100 text-slate-700 border border-slate-200',
  };

  const labelMap = {
    active: 'Active',
    closed: 'Closed',
    draft: 'Draft',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${styles[status] || styles.draft}`}>
      {labelMap[status] || status}
    </span>
  );
};

const MyJobsPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { jobs, jobsLoading, jobsError } = useAppSelector((state) => state.jobs);
  const { profile: employerProfile } = useAppSelector((state) => state.employer);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [experienceFilter, setExperienceFilter] = useState('all');
  const [employmentFilter, setEmploymentFilter] = useState('all');
  const [topCandidatesModal, setTopCandidatesModal] = useState({ isOpen: false, jobId: null, jobTitle: '' });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, jobId: null });

  const getJobSortTimestamp = (job) => {
    const dateValue = job?.publishedAt || job?.postedAt || job?.createdAt;
    const timestamp = dateValue ? new Date(dateValue).getTime() : 0;
    return Number.isNaN(timestamp) ? 0 : timestamp;
  };

  const uniqueDepartments = useMemo(() => {
    return [...new Set(jobs.map((job) => job.department).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const uniqueLocations = useMemo(() => {
    return [...new Set(jobs.map((job) => job.location).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const uniqueExperienceLevels = useMemo(() => {
    return [...new Set(jobs.map((job) => job.experienceLevel).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  const uniqueEmploymentTypes = useMemo(() => {
    return [...new Set(jobs.map((job) => job.employmentType).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  useEffect(() => {
    const loadData = async () => {
      const token = await getToken();
      dispatch(fetchEmployerProfile({ token }));
      dispatch(fetchEmployerJobs({ token }));
    };
    loadData();
  }, [dispatch, getToken]);

  const filteredJobs = useMemo(() => {
    let list = [...jobs];

    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      list = list.filter((job) =>
        job.title?.toLowerCase().includes(lowerSearch) ||
        job.department?.toLowerCase().includes(lowerSearch) ||
        job.location?.toLowerCase().includes(lowerSearch)
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter((job) => job.status === statusFilter);
    }

    if (departmentFilter !== 'all') {
      list = list.filter((job) => job.department === departmentFilter);
    }

    if (locationFilter !== 'all') {
      list = list.filter((job) => job.location === locationFilter);
    }

    if (experienceFilter !== 'all') {
      list = list.filter((job) => job.experienceLevel === experienceFilter);
    }

    if (employmentFilter !== 'all') {
      list = list.filter((job) => job.employmentType === employmentFilter);
    }

    switch (sortBy) {
      case 'oldest':
        list.sort((a, b) => getJobSortTimestamp(a) - getJobSortTimestamp(b));
        break;
      case 'applications':
        list.sort((a, b) => (b.applicationsCount || 0) - (a.applicationsCount || 0));
        break;
      case 'views':
        list.sort((a, b) => (b.metadata?.views || 0) - (a.metadata?.views || 0));
        break;
      case 'title-asc':
        list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'title-desc':
        list.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        break;
      case 'newest':
      default:
        list.sort((a, b) => getJobSortTimestamp(b) - getJobSortTimestamp(a));
        break;
    }

    return list;
  }, [jobs, searchTerm, statusFilter, sortBy, departmentFilter, locationFilter, experienceFilter, employmentFilter]);

  const stats = useMemo(() => {
    const total = jobs.length;
    const active = jobs.filter((job) => job.status === 'active').length;
    const draft = jobs.filter((job) => job.status === 'draft').length;
    const closed = jobs.filter((job) => job.status === 'closed').length;

    return { total, active, draft, closed };
  }, [jobs]);

  const handleViewApplications = (jobId) => {
    navigate(`/employer/jobs/${jobId}/applications`);
  };

  const handleViewTopCandidates = (job) => {
    setTopCandidatesModal({
      isOpen: true,
      jobId: job._id || job.id,
      jobTitle: job.title
    });
  };

  const closeTopCandidatesModal = () => {
    setTopCandidatesModal({ isOpen: false, jobId: null, jobTitle: '' });
  };

  const handleEditJob = (jobId) => {
    navigate(`/employer/jobs/${jobId}/edit`);
  };

  const handleToggleStatus = async (job) => {
    const nextStatus = job.status === 'active' ? 'closed' : 'active';
    const token = await getToken();
    dispatch(updateJobStatus({ jobId: job._id || job.id, status: nextStatus, token }));
  };

  const handleDeleteJob = (jobId) => {
    setDeleteConfirm({ open: true, jobId });
  };

  const confirmDeleteJob = async () => {
    try {
      await dispatch(deleteJob(deleteConfirm.jobId)).unwrap();
    } catch (error) {
      console.error('Failed to delete job:', error);
    }
    setDeleteConfirm({ open: false, jobId: null });
  };

  const handleCreateJob = () => {
    navigate('/employer/jobs/create');
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  const getPostedDate = (job) => job.publishedAt || job.postedAt || job.createdAt;

  return (
    <div className="min-h-screen bg-slate-50">
      <EmployerHeader 
        userName={employerProfile?.user?.fullName || 'User'}
        companyName={employerProfile?.companyName || 'Company'}
      />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="space-y-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                Employer Portal
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                My Job Postings
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage open roles, track applications, and keep postings up to date.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreateJob}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <Plus className="h-4 w-4" />
              New Job
            </button>
          </div>

          {/* Filters */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by title, department, or location..."
                  className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Filter className="h-4 w-4" />
                Status:
              </div>
              <div className="flex flex-wrap gap-2">
                {statusFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatusFilter(filter.value)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                      statusFilter === filter.value
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                <option value="all">All Departments</option>
                {uniqueDepartments.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>

              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                <option value="all">All Locations</option>
                {uniqueLocations.map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>

              <select
                value={experienceFilter}
                onChange={(e) => setExperienceFilter(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                <option value="all">All Experience Levels</option>
                {uniqueExperienceLevels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>

              <select
                value={employmentFilter}
                onChange={(e) => setEmploymentFilter(e.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                <option value="all">All Employment Types</option>
                {uniqueEmploymentTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Total Jobs
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                Active
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-800">{stats.active}</p>
            </div>
            <div className="rounded-2xl border border-orange-100 bg-orange-50/70 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-orange-600">
                Closed
              </p>
              <p className="mt-2 text-2xl font-semibold text-orange-800">{stats.closed}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                Drafts
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.draft}</p>
            </div>
          </div>

          {/* Jobs List */}
          <section className="space-y-4">
            {jobsLoading && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                Loading job postings...
              </div>
            )}
            {jobsError && (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
                {jobsError}
              </div>
            )}
            {!jobsLoading && filteredJobs.length === 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <FileText className="h-5 w-5" />
                </div>
                <p className="text-base font-semibold text-slate-900">No jobs found</p>
                <p className="mt-1 text-sm text-slate-500">
                  Try adjusting your filters or create a new posting.
                </p>
                <button
                  type="button"
                  onClick={handleCreateJob}
                  className="mt-4 inline-flex items-center gap-1 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  Post a Job
                </button>
              </div>
            )}

            {filteredJobs.map((job) => {
              const jobId = job._id || job.id;
              return (
              <div
                key={jobId}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-900">{job.title}</h3>
                      <StatusBadge status={job.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Posted {formatDate(getPostedDate(job))} · {job.department || 'General'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2 text-slate-700">
                    <Users className="h-4 w-4" />
                    <div className="text-right">
                      <p className="text-base font-semibold text-slate-900">
                        {job.applicationsCount || 0}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Applications
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleViewTopCandidates(job)}
                    className="inline-flex items-center gap-2 rounded-full border-2 border-violet-300 bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-1.5 text-sm font-semibold text-violet-700 transition-all hover:border-violet-400 hover:from-violet-100 hover:to-purple-100"
                  >
                    <Sparkles className="h-4 w-4" />
                    AI Top Candidates
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewApplications(jobId)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
                  >
                    <FileText className="h-4 w-4" />
                    View Applications
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditJob(jobId)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </button>
                  {job.status === 'active' ? (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(job)}
                      className="inline-flex items-center gap-2 rounded-full border border-orange-200 px-4 py-1.5 text-sm font-medium text-orange-700 transition-colors hover:border-orange-300 hover:bg-orange-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Close Job
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(job)}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-4 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Reopen Job
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteJob(jobId)}
                    className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-1.5 text-sm font-medium text-red-700 transition-colors hover:border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            )})}
          </section>
        </motion.section>
      </main>

      {/* Top Candidates Modal */}
      <TopCandidatesDashboard
        isOpen={topCandidatesModal.isOpen}
        onClose={closeTopCandidatesModal}
        jobId={topCandidatesModal.jobId}
        jobTitle={topCandidatesModal.jobTitle}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Job Posting"
        message="Are you sure you want to delete this job posting? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDeleteJob}
        onCancel={() => setDeleteConfirm({ open: false, jobId: null })}
      />
    </div>
  );
};

export default MyJobsPage;

