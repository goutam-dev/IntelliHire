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
    active: 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm',
    closed: 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm',
    draft: 'bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-sm',
    archived: 'bg-zinc-100 text-zinc-700 border border-zinc-200 shadow-sm',
  };

  const labelMap = {
    active: 'Active',
    closed: 'Closed',
    draft: 'Draft',
    archived: 'Archived',
  };

  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${styles[status] || styles.draft}`}>
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
  const [closeConfirm, setCloseConfirm] = useState({ open: false, job: null });

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
    if (nextStatus === 'closed') {
      setCloseConfirm({ open: true, job });
      return;
    }

    const token = await getToken();
    dispatch(updateJobStatus({ jobId: job._id || job.id, status: nextStatus, token }));
  };

  const confirmCloseJob = async () => {
    if (!closeConfirm.job) return;
    const token = await getToken();
    dispatch(updateJobStatus({ jobId: closeConfirm.job._id || closeConfirm.job.id, status: 'closed', token }));
    setCloseConfirm({ open: false, job: null });
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
    <div className="min-h-screen bg-zinc-50 pb-12">
      <EmployerHeader 
        userName={employerProfile?.user?.fullName || 'User'}
        companyName={employerProfile?.companyName || 'Company'}
      />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="space-y-8"
        >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between rounded-3xl bg-zinc-900 p-6 md:p-8 shadow-md border border-zinc-800 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-zinc-800/40 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  My Job Postings
                </h1>
                <p className="mt-1.5 text-sm font-medium text-zinc-400">
                  Manage open roles, track applications, and keep postings up to date.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCreateJob}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 relative z-10"
              >
                <Plus className="h-4 w-4" />
                New Job
              </button>
            </div>
          {/* Filters */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by title, department, or location..."
                  className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-sm"
                />
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                <Filter className="h-4 w-4 text-zinc-400" />
                Status:
              </div>
              <div className="flex flex-wrap gap-2">
                {statusFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatusFilter(filter.value)}
                    className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors shadow-sm ${
                      statusFilter === filter.value
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
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
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-medium text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-sm"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-5 border-t border-zinc-100">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-medium text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-sm"
              >
                <option value="all">All Departments</option>
                {uniqueDepartments.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>

              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-medium text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-sm"
              >
                <option value="all">All Locations</option>
                {uniqueLocations.map((location) => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>

              <select
                value={experienceFilter}
                onChange={(e) => setExperienceFilter(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-medium text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-sm"
              >
                <option value="all">All Experience Levels</option>
                {uniqueExperienceLevels.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>

              <select
                value={employmentFilter}
                onChange={(e) => setEmploymentFilter(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2 font-medium text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 shadow-sm"
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
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
              {jobsLoading ? (
                 <div className="space-y-4 py-1">
                   <div className="h-4 w-20 bg-zinc-200 rounded animate-pulse"></div>
                   <div className="h-8 w-12 bg-zinc-200 rounded animate-pulse"></div>
                 </div>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Total Jobs
                  </p>
                  <p className="mt-2 text-3xl font-bold text-zinc-900">{stats.total}</p>
                </>
              )}
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
              {jobsLoading ? (
                 <div className="space-y-4 py-1">
                   <div className="h-4 w-20 bg-zinc-200 rounded animate-pulse"></div>
                   <div className="h-8 w-12 bg-zinc-200 rounded animate-pulse"></div>
                 </div>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Active
                  </p>
                  <p className="mt-2 text-3xl font-bold text-zinc-900">{stats.active}</p>
                </>
              )}
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
              {jobsLoading ? (
                 <div className="space-y-4 py-1">
                   <div className="h-4 w-20 bg-zinc-200 rounded animate-pulse"></div>
                   <div className="h-8 w-12 bg-zinc-200 rounded animate-pulse"></div>
                 </div>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Closed
                  </p>
                  <p className="mt-2 text-3xl font-bold text-zinc-900">{stats.closed}</p>
                </>
              )}
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="absolute top-0 left-0 w-full h-1 bg-zinc-400"></div>
              {jobsLoading ? (
                 <div className="space-y-4 py-1">
                   <div className="h-4 w-20 bg-zinc-200 rounded animate-pulse"></div>
                   <div className="h-8 w-12 bg-zinc-200 rounded animate-pulse"></div>
                 </div>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Drafts
                  </p>
                  <p className="mt-2 text-3xl font-bold text-zinc-900">{stats.draft}</p>
                </>
              )}
            </div>
          </div>

          {/* Jobs List */}
          <section className="space-y-5">
            {jobsLoading && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm font-medium text-zinc-500 shadow-sm">
                Loading job postings...
              </div>
            )}
            {jobsError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm font-medium text-rose-700 shadow-sm">
                {jobsError}
              </div>
            )}
            {!jobsLoading && filteredJobs.length === 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-50 border border-zinc-100 text-zinc-400">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="text-lg font-bold text-zinc-900">No jobs found</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Try adjusting your filters or create a new posting.
                </p>
                <button
                  type="button"
                  onClick={handleCreateJob}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
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
                className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:shadow-md group"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-zinc-200 group-hover:bg-gradient-to-b group-hover:from-zinc-300 group-hover:to-zinc-400 transition-colors"></div>
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between border-b border-zinc-100 pb-6 pl-3">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-bold text-zinc-900 transition-colors">{job.title}</h3>
                      <StatusBadge status={job.status} />
                    </div>
                    <div className="flex items-center gap-4 text-sm font-medium text-zinc-500">
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-zinc-400" />
                        {job.department || 'General'}
                      </span>
                      <span className="h-1 w-1 rounded-full bg-zinc-300"></span>
                      <span>Posted {formatDate(getPostedDate(job))}</span>
                    </div>
                  </div>

                  {/* Applicants Metric Box */}
                  <div className="flex flex-col min-w-[130px] rounded-xl bg-zinc-50/50 border border-zinc-100 px-5 py-3 text-zinc-600 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Applicants
                      </p>
                      <Users className="h-3.5 w-3.5 text-zinc-400" />
                    </div>
                    <p className="text-3xl font-black text-zinc-900 leading-none">
                      {job.applicationsCount || 0}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pl-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => handleViewTopCandidates(job)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-zinc-50 to-white px-5 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm ring-1 ring-inset ring-zinc-300 transition-all hover:from-white hover:to-zinc-50 hover:shadow-md hover:ring-zinc-400 group/ai"
                  >
                    <Sparkles className="h-4 w-4 text-zinc-500 group-hover/ai:text-zinc-700 transition-colors" />
                    AI Top Candidates
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewApplications(jobId)}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    <Users className="h-4 w-4 text-zinc-400" />
                    View Applications
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditJob(jobId)}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    <Edit3 className="h-4 w-4 text-zinc-400" />
                    Edit
                  </button>

                  <div className="flex-1 min-w-[20px]"></div> {/* Spacer to push dangerous actios to right */}

                  {job.status === 'active' ? (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(job)}
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Close Job
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(job)}
                      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Reopen Job
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteJob(jobId)}
                    className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm transition-colors hover:border-rose-300 hover:bg-rose-50"
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

      <ConfirmDialog
        open={closeConfirm.open}
        title="Close Job Posting"
        message="Closing this job will stop new applications, but it will not change any candidate application status. Continue?"
        confirmLabel="Close Job"
        cancelLabel="Cancel"
        variant="info"
        onConfirm={confirmCloseJob}
        onCancel={() => setCloseConfirm({ open: false, job: null })}
      />
    </div>
  );
};

export default MyJobsPage;

