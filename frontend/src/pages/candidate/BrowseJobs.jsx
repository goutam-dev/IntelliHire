import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Clock,
  Users,
  Eye,
  ExternalLink,
  Building2,
  GraduationCap,
  Star,
  Bookmark,
  CalendarDays
} from 'lucide-react';
import { 
  fetchJobs, 
  fetchFilterOptions, 
  setFilters, 
  resetFilters
} from '../../store/slices/jobSlice';
import { 
  fetchMyApplications,
  checkApplicationStatus, 
  forceRefreshApplicationStatus 
} from '../../store/slices/jobApplicationsSlice';
import { fetchProfileCompletion } from '../../store/slices/profileCompletionSlice';
import JobCard from '../../components/candidate/JobCard';
import { isApplicationDeadlinePassed } from '../../utils/jobAvailability';
// CandidateHeader is now handled by CandidateLayout
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  }
};

const staggerChildren = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "backOut"
    }
  }
};

// Filters Sidebar Component
const FiltersSidebar = ({ isOpen, onClose, jobsContainerRef, isDesktop = false }) => {
  const dispatch = useDispatch();
  const { filters, filterOptions, filtersLoading } = useSelector(state => state.jobs);
  const [localFilters, setLocalFilters] = useState(filters);

  const DEFAULT_EXPERIENCE_LEVELS = ['no-experience', 'entry', 'mid', 'senior', 'expert'];
  const DEFAULT_EMPLOYMENT_TYPES = ['full-time', 'part-time', 'contract', 'remote'];

  const normalizeOptionItems = (items, fallbackValues = []) => {
    const normalized = (items || []).map((item) => {
      if (typeof item === 'string') {
        return { value: item, count: null };
      }
      return { value: item?.value, count: item?.count ?? null };
    }).filter((item) => item.value);

    const existingValues = new Set(normalized.map((item) => item.value));
    fallbackValues.forEach((value) => {
      if (!existingValues.has(value)) {
        normalized.push({ value, count: 0 });
      }
    });

    return normalized;
  };

  const departmentOptions = normalizeOptionItems(filterOptions.departments);
  const experienceOptions = normalizeOptionItems(filterOptions.experienceLevels, DEFAULT_EXPERIENCE_LEVELS);
  const employmentOptions = normalizeOptionItems(filterOptions.employmentTypes, DEFAULT_EMPLOYMENT_TYPES);

  // Update local filters when global filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    
    // Apply filters immediately for desktop, or wait for mobile apply button
    if (isDesktop) {
      dispatch(setFilters(newFilters));
      const filterPromise = dispatch(fetchJobs({ ...newFilters, page: 1, limit: 1000, includeClosed: true }));
      
      // Scroll to top when filters change
      if (jobsContainerRef && jobsContainerRef.current) {
        jobsContainerRef.current.scrollTop = 0;
      }
      
      // Add visual feedback for filter changes
      if (filterPromise && typeof filterPromise.then === 'function') {
        filterPromise.catch(console.error);
      }
    }
  };

  const applyFilters = () => {
    dispatch(setFilters(localFilters));
    dispatch(fetchJobs({ ...localFilters, page: 1, limit: 1000, includeClosed: true }));
    onClose();
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      location: '',
      department: '',
      experienceLevel: '',
      employmentType: '',
      salaryMin: '',
      salaryMax: '',
      postedDate: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    dispatch(resetFilters());
    setLocalFilters(clearedFilters);
    dispatch(fetchJobs({ page: 1, limit: 1000, includeClosed: true }));
    if (onClose) onClose();
  };

  const desktopSidebar = (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm h-full flex flex-col">
      <div className="p-6 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#d4d4d8_transparent]">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">Filters</h2>
        </div>

        {/* Filter Options */}
        <div className="space-y-6">
          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Location
            </label>
            <select
              value={localFilters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm bg-zinc-50 hover:bg-white transition-colors"
            >
              <option value="">All Locations</option>
              {filterOptions.locations?.map(location => (
                <option key={location} value={location}>{location}</option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Department
            </label>
            <select
              value={localFilters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm bg-zinc-50 hover:bg-white transition-colors"
            >
              <option value="">All Departments</option>
              {departmentOptions.map(department => (
                <option key={department.value} value={department.value}>
                  {department.count === null ? department.value : `${department.value} (${department.count})`}
                </option>
              ))}
            </select>
          </div>

          {/* Experience Level */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Experience Level
            </label>
            <select
              value={localFilters.experienceLevel}
              onChange={(e) => handleFilterChange('experienceLevel', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm bg-zinc-50 hover:bg-white transition-colors"
            >
              <option value="">All Levels</option>
              {experienceOptions.map(level => (
                <option key={level.value} value={level.value}>
                  {level.count === null ? level.value : `${level.value} (${level.count})`}
                </option>
              ))}
            </select>
          </div>

          {/* Employment Type */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Employment Type
            </label>
            <select
              value={localFilters.employmentType}
              onChange={(e) => handleFilterChange('employmentType', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm bg-zinc-50 hover:bg-white transition-colors"
            >
              <option value="">All Types</option>
              {employmentOptions.map(type => (
                <option key={type.value} value={type.value}>
                  {type.count === null ? type.value : `${type.value} (${type.count})`}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Sort By
            </label>
            <select
              value={localFilters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm bg-zinc-50 hover:bg-white transition-colors"
            >
              <option value="createdAt">Date Posted</option>
              <option value="salaryMin">Minimum Salary</option>
              <option value="salaryMax">Maximum Salary</option>
              <option value="title">Job Title</option>
              <option value="applicationDeadline">Application Deadline</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Sort Order
            </label>
            <select
              value={localFilters.sortOrder}
              onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm bg-zinc-50 hover:bg-white transition-colors"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          {/* Salary Range */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Salary Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min"
                value={localFilters.salaryMin}
                onChange={(e) => handleFilterChange('salaryMin', e.target.value)}
                className="px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm bg-zinc-50 hover:bg-white transition-colors placeholder:text-zinc-400"
              />
              <input
                type="number"
                placeholder="Max"
                value={localFilters.salaryMax}
                onChange={(e) => handleFilterChange('salaryMax', e.target.value)}
                className="px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm bg-zinc-50 hover:bg-white transition-colors placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Posted Date */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Posted Date
            </label>
            <select
              value={localFilters.postedDate}
              onChange={(e) => handleFilterChange('postedDate', e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 focus:border-transparent text-sm bg-zinc-50 hover:bg-white transition-colors"
            >
              <option value="">Any time</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8">
          <button
            onClick={clearFilters}
            className="w-full px-4 py-2 border border-zinc-200 text-zinc-700 font-medium rounded-xl hover:bg-zinc-50 hover:text-zinc-900 transition-colors shadow-sm"
          >
            Clear All Filters
          </button>
        </div>
      </div>
    </div>
  );

  // Mobile version (modal)
  const mobileSidebar = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          
          {/* Sidebar */}
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            className="fixed left-0 top-0 h-full w-80 bg-white shadow-xl z-50"
          >
            <div className="p-6 h-full overflow-y-auto custom-scrollbar">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filter Options */}
              <div className="space-y-6">
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Location
                  </label>
                  <select
                    value={localFilters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  >
                    <option value="">All Locations</option>
                    {filterOptions.locations?.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Department
                  </label>
                  <select
                    value={localFilters.department}
                    onChange={(e) => handleFilterChange('department', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  >
                    <option value="">All Departments</option>
                    {departmentOptions.map(department => (
                      <option key={department.value} value={department.value}>
                        {department.count === null ? department.value : `${department.value} (${department.count})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Experience Level */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Experience Level
                  </label>
                  <select
                    value={localFilters.experienceLevel}
                    onChange={(e) => handleFilterChange('experienceLevel', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  >
                    <option value="">All Levels</option>
                    {experienceOptions.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.count === null ? level.value : `${level.value} (${level.count})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Employment Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Employment Type
                  </label>
                  <select
                    value={localFilters.employmentType}
                    onChange={(e) => handleFilterChange('employmentType', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  >
                    <option value="">All Types</option>
                    {employmentOptions.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.count === null ? type.value : `${type.value} (${type.count})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Sort By
                  </label>
                  <select
                    value={localFilters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  >
                    <option value="createdAt">Date Posted</option>
                    <option value="salaryMin">Minimum Salary</option>
                    <option value="salaryMax">Maximum Salary</option>
                    <option value="title">Job Title</option>
                    <option value="applicationDeadline">Application Deadline</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Sort Order
                  </label>
                  <select
                    value={localFilters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>

                {/* Salary Range */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Salary Range
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={localFilters.salaryMin}
                      onChange={(e) => handleFilterChange('salaryMin', e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={localFilters.salaryMax}
                      onChange={(e) => handleFilterChange('salaryMax', e.target.value)}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Posted Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Posted Date
                  </label>
                  <select
                    value={localFilters.postedDate}
                    onChange={(e) => handleFilterChange('postedDate', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  >
                    <option value="">Any time</option>
                    <option value="24h">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-8">
                <button
                  onClick={clearFilters}
                  className="flex-1 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 font-medium rounded-xl transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-1 px-4 py-2 bg-zinc-900 border-zinc-900 font-medium text-white rounded-xl hover:bg-zinc-800 transition-colors shadow-sm"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Return appropriate version based on screen size
  return isDesktop ? desktopSidebar : mobileSidebar;
};

// Loading Skeleton Component
const JobCardSkeleton = ({ index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm animate-pulse"
  >
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <div className="h-6 bg-zinc-200 rounded w-3/4 mb-3"></div>
        <div className="flex gap-4">
          <div className="h-4 bg-zinc-100 rounded w-24"></div>
          <div className="h-4 bg-zinc-100 rounded w-20"></div>
        </div>
      </div>
      <div className="text-right">
        <div className="h-4 bg-zinc-200 rounded w-8 mb-2"></div>
      </div>
    </div>
    
    <div className="space-y-4 mb-6">
      <div className="flex gap-4">
        <div className="h-4 bg-zinc-100 rounded w-20"></div>
        <div className="h-4 bg-zinc-100 rounded w-24"></div>
        <div className="h-4 bg-zinc-100 rounded w-28"></div>
      </div>
      <div className="space-y-2 mt-4">
        <div className="h-3 bg-zinc-100 rounded w-full"></div>
        <div className="h-3 bg-zinc-100 rounded w-5/6"></div>
      </div>
      <div className="flex gap-2 mt-4 pt-2">
        <div className="h-6 bg-zinc-100 rounded-md w-16"></div>
        <div className="h-6 bg-zinc-100 rounded-md w-20"></div>
        <div className="h-6 bg-zinc-100 rounded-md w-18"></div>
      </div>
    </div>
    
    <div className="flex gap-3 pt-4 border-t border-zinc-100">
      <div className="h-10 bg-zinc-100 rounded-lg flex-1"></div>
      <div className="h-10 bg-zinc-200 rounded-lg flex-1"></div>
    </div>
  </motion.div>
);

// Search Loading Component
const SearchLoadingOverlay = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl"
  >
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-slate-600 mx-auto mb-2"></div>
      <p className="text-sm text-slate-600">Searching jobs...</p>
    </div>
  </motion.div>
);

// Custom hook for debounced search
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Main Browse Jobs Component
const BrowseJobs = () => {
  const CLIENT_PAGE_SIZE = 10;
  const FETCH_LIMIT = 1000;

  const dispatch = useDispatch();
  const location = useLocation();
  const { 
    jobs, 
    loading, 
    error, 
    filters 
  } = useSelector(state => state.jobs);
  const { applicationStatuses, myApplications, loading: applicationLoading } = useSelector(state => state.jobApplications);

  const [currentPage, setCurrentPage] = useState(1);
  const [initialHydrationDone, setInitialHydrationDone] = useState(false);

  const appliedJobIds = useMemo(() => {
    const ids = new Set();

    (myApplications || []).forEach((application) => {
      if (application?.status === 'Withdrawn') return;
      const jobId = application?.jobId?._id || application?.jobId;
      if (jobId) ids.add(String(jobId));
    });

    Object.entries(applicationStatuses || {}).forEach(([jobId, status]) => {
      if (status?.hasApplied) {
        ids.add(String(jobId));
      }
    });

    return ids;
  }, [myApplications, applicationStatuses]);

  const visibleJobs = useMemo(() => jobs.filter((job) => {
    if (!isApplicationDeadlinePassed(job?.applicationDeadline)) {
      return true;
    }

    return appliedJobIds.has(String(job?._id));
  }), [jobs, appliedJobIds]);

  const totalPages = Math.max(1, Math.ceil(visibleJobs.length / CLIENT_PAGE_SIZE));
  const paginatedJobs = useMemo(() => {
    const start = (currentPage - 1) * CLIENT_PAGE_SIZE;
    return visibleJobs.slice(start, start + CLIENT_PAGE_SIZE);
  }, [visibleJobs, currentPage]);

  const hasExpiredJobsInFetchedResults = useMemo(
    () => jobs.some((job) => isApplicationDeadlinePassed(job?.applicationDeadline)),
    [jobs]
  );

  const isHydratingVisibility =
    !loading &&
    hasExpiredJobsInFetchedResults &&
    applicationLoading.fetchingApplications;
  
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [showFilters, setShowFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Ref for jobs container to control scrolling
  const jobsContainerRef = useRef(null);

  const fetchCompactJobs = (query = filters) => {
    return dispatch(fetchJobs({ ...query, page: 1, limit: FETCH_LIMIT, includeClosed: true }));
  };

  useEffect(() => {
    setInitialHydrationDone(false);
    dispatch(fetchFilterOptions());
    const jobsPromise = fetchCompactJobs();
    const applicationsPromise = dispatch(fetchMyApplications({ page: 1, limit: FETCH_LIMIT }));
    dispatch(fetchProfileCompletion());

    Promise.allSettled([jobsPromise, applicationsPromise]).finally(() => {
      setInitialHydrationDone(true);
    });
  }, [dispatch]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Check application statuses for currently visible page jobs.
  useEffect(() => {
    if (!paginatedJobs || paginatedJobs.length === 0) return;

    paginatedJobs.forEach(job => {
      if (job?._id && !applicationStatuses[job._id]) {
        dispatch(checkApplicationStatus(job._id));
      }
    });
  }, [dispatch, paginatedJobs, applicationStatuses]);

  // Handle force refresh when returning from application page
  useEffect(() => {
    if (location.state?.forceRefresh && location.state?.appliedJobId) {
      const appliedJobId = location.state.appliedJobId;

      
      // Force refresh the specific job's application status by clearing cache first
      dispatch(forceRefreshApplicationStatus({ jobId: appliedJobId }));
      dispatch(checkApplicationStatus(appliedJobId));
      dispatch(fetchMyApplications({ page: 1, limit: FETCH_LIMIT }));
      
      // Clear the location state to prevent repeated refreshes
      window.history.replaceState({}, document.title);
    }
  }, [dispatch, location.state]);

  // Live search effect with abort controller
  useEffect(() => {
    if (debouncedSearchTerm !== filters.search) {
      setIsSearching(true);
      setCurrentPage(1);
      dispatch(setFilters({ search: debouncedSearchTerm }));
      
      const abortController = new AbortController();
      const searchPromise = fetchCompactJobs({ ...filters, search: debouncedSearchTerm });
      
      // Scroll to top when search results change
      if (jobsContainerRef?.current) {
        jobsContainerRef.current.scrollTop = 0;
      }
      
      // Handle promise if it exists
      if (searchPromise && typeof searchPromise.then === 'function') {
        searchPromise.finally(() => {
          setTimeout(() => setIsSearching(false), 300);
        }).catch((error) => {
          if (error.name === 'AbortError') {
            // Search request was aborted — no action needed
          }
        });
      } else {
        // Fallback timeout
        setTimeout(() => setIsSearching(false), 800);
      }

      // Cleanup: abort on unmount or search term change
      return () => {
        abortController.abort();
        setIsSearching(false);
      };
    }
  }, [debouncedSearchTerm, dispatch, filters]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    
    // Scroll to top immediately before fetching new data
    if (jobsContainerRef.current) {
      jobsContainerRef.current.scrollTop = 0;
    } else {
      window.scrollTo(0, 0);
    }
    
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-8">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-2 rounded-lg border border-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 text-zinc-600 transition-colors shadow-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        {pages.map(page => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-4 py-2 font-medium rounded-lg border shadow-sm transition-colors ${
              page === currentPage
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-2 rounded-lg border border-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-50 text-zinc-600 transition-colors shadow-sm"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">Error loading jobs</div>
          <p className="text-slate-600 mb-4">{error}</p>
          <button 
            onClick={() => fetchCompactJobs()}
            className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50/50 pb-12">
      {/* Hero Section */}
      <div className="bg-zinc-900 py-16 px-4 sm:px-6 relative overflow-hidden">
        {/* Abstract decorative elements */}
        <div className="absolute top-0 left-0 right-0 h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-zinc-800 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
          <div className="absolute top-12 -right-24 w-96 h-96 bg-zinc-800 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-24 left-48 w-96 h-96 bg-zinc-800 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerChildren}
            className="flex flex-col items-center text-center space-y-8"
          >
            {/* Header Text */}
            <motion.div variants={fadeUp} className="max-w-2xl">
              <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
                Find Your <span className="text-zinc-400">Dream Job</span>
              </h1>
              <p className="text-lg font-medium text-zinc-400">
                Discover {visibleJobs.length > 0 ? visibleJobs.length : 'many'} exciting career opportunities curated just for you.
              </p>
            </motion.div>

            {/* Search Bar */}
            <motion.div variants={fadeUp} className="w-full max-w-3xl">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative group w-full">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5 transition-colors group-focus-within:text-zinc-900" />
                  <input
                    type="text"
                    placeholder="Search by job title, company, or keywords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder:text-zinc-400 rounded-2xl focus:bg-white focus:text-zinc-900 focus:placeholder:text-zinc-500 focus:ring-4 focus:ring-zinc-500/30 focus:border-transparent transition-all shadow-xl font-medium"
                  />
                  {(isSearching || (loading && searchTerm)) && (
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-zinc-400 border-t-white group-focus-within:border-zinc-300 group-focus-within:border-t-zinc-900"></div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilters(true)}
                  className="lg:hidden flex items-center justify-center gap-2 px-6 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl hover:bg-white/20 transition-colors shadow-xl font-semibold"
                >
                  <Filter className="w-5 h-5" />
                  Filters
                </button>
              </div>
              
              {/* Search Result Count */}
              <AnimatePresence>
                {searchTerm && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="mt-3 text-sm font-medium text-zinc-400 text-left ml-2"
                  >
                    {isSearching || loading ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-zinc-500 border-t-zinc-300"></div>
                        Searching...
                      </span>
                    ) : (
                      `Found ${visibleJobs.length} jobs matching "${searchTerm}"`
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 mt-4 relative z-20">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar Filters */}
          <div className="hidden lg:block lg:col-span-3 sticky top-6">
            <FiltersSidebar isDesktop={true} jobsContainerRef={jobsContainerRef} />
          </div>

          {/* Jobs List */}
          <div 
            ref={jobsContainerRef}
            className="lg:col-span-9 flex flex-col gap-6"
          >
            {(!initialHydrationDone || (loading && !isSearching) || isHydratingVisibility) ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 gap-6"
              >
                {[...Array(5)].map((_, index) => (
                  <JobCardSkeleton key={index} index={index} />
                ))}
              </motion.div>
            ) : visibleJobs.length === 0 ? (
              <motion.div 
                variants={fadeUp}
                className="text-center py-20 bg-white border border-zinc-200 rounded-2xl shadow-sm"
              >
                <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Search className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 mb-2">No jobs found</h3>
                <p className="text-sm text-zinc-500 mb-6 max-w-sm mx-auto">
                  Try adjusting your search criteria or removing filters to find more opportunities.
                </p>
                <button
                  onClick={() => {
                    dispatch(resetFilters());
                    setCurrentPage(1);
                    fetchCompactJobs({
                      search: '',
                      location: '',
                      department: '',
                      experienceLevel: '',
                      employmentType: '',
                      salaryMin: '',
                      salaryMax: '',
                      postedDate: '',
                      sortBy: 'createdAt',
                      sortOrder: 'desc'
                    });
                    setSearchTerm('');
                  }}
                  className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors shadow-sm text-sm font-medium"
                >
                  Clear Filters
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="jobs-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                variants={staggerChildren}
                className="grid grid-cols-1 gap-6"
              >
                {paginatedJobs.map((job, index) => (
                  <JobCard key={job._id} job={job} index={index} />
                ))}
              </motion.div>
            )}

            {/* Pagination Controls */}
            {renderPagination()}
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      <div className="lg:hidden">
        <FiltersSidebar isOpen={showFilters} isDesktop={false} onClose={() => setShowFilters(false)} jobsContainerRef={jobsContainerRef} />
      </div>
    </main>
  );
};

export default BrowseJobs;