import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  resetFilters, 
  setCurrentPage 
} from '../../store/slices/jobSlice';
import { 
  checkApplicationStatus, 
  forceRefreshApplicationStatus 
} from '../../store/slices/jobApplicationsSlice';
import { fetchProfileCompletion } from '../../store/slices/profileCompletionSlice';
import JobCard from '../../components/candidate/JobCard';
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

  const DEFAULT_EXPERIENCE_LEVELS = ['entry', 'mid', 'senior', 'expert'];
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
      const filterPromise = dispatch(fetchJobs({ ...newFilters, page: 1 }));
      
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
    dispatch(fetchJobs({ ...localFilters, page: 1 }));
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
    dispatch(fetchJobs({ page: 1 }));
    if (onClose) onClose();
  };

  // Desktop version (always visible)
  const desktopSidebar = (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col">
      <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
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
        <div className="mt-8">
          <button
            onClick={clearFilters}
            className="w-full px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
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
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={applyFilters}
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
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
    className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse"
  >
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
        <div className="flex gap-4">
          <div className="h-4 bg-slate-200 rounded w-24"></div>
          <div className="h-4 bg-slate-200 rounded w-20"></div>
        </div>
      </div>
      <div className="text-right">
        <div className="h-4 bg-slate-200 rounded w-16 mb-1"></div>
        <div className="h-3 bg-slate-200 rounded w-12"></div>
      </div>
    </div>
    
    <div className="space-y-3 mb-4">
      <div className="flex gap-4">
        <div className="h-4 bg-slate-200 rounded w-20"></div>
        <div className="h-4 bg-slate-200 rounded w-24"></div>
        <div className="h-4 bg-slate-200 rounded w-28"></div>
      </div>
      <div className="h-4 bg-slate-200 rounded w-full"></div>
      <div className="h-4 bg-slate-200 rounded w-2/3"></div>
      <div className="flex gap-2">
        <div className="h-6 bg-slate-200 rounded-full w-16"></div>
        <div className="h-6 bg-slate-200 rounded-full w-20"></div>
        <div className="h-6 bg-slate-200 rounded-full w-18"></div>
      </div>
    </div>
    
    <div className="flex gap-3">
      <div className="h-10 bg-slate-200 rounded flex-1"></div>
      <div className="h-10 bg-slate-200 rounded flex-1"></div>
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
  const dispatch = useDispatch();
  const location = useLocation();
  const { 
    jobs, 
    loading, 
    error, 
    pagination, 
    filters 
  } = useSelector(state => state.jobs);
  const { applicationStatuses } = useSelector(state => state.jobApplications);
  
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [showFilters, setShowFilters] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Ref for jobs container to control scrolling
  const jobsContainerRef = useRef(null);

  useEffect(() => {
    dispatch(fetchFilterOptions());
    dispatch(fetchJobs({ page: 1 }));
    dispatch(fetchProfileCompletion());
  }, [dispatch]);

  // Check application statuses for all jobs when they're loaded
  useEffect(() => {
    if (!jobs || jobs.length === 0) return;

    // Check only missing statuses to avoid re-request storms.
    jobs.forEach(job => {
      if (job?._id && !applicationStatuses[job._id]) {
        dispatch(checkApplicationStatus(job._id));
      }
    });
  }, [dispatch, jobs]);

  // Handle force refresh when returning from application page
  useEffect(() => {
    if (location.state?.forceRefresh && location.state?.appliedJobId) {
      const appliedJobId = location.state.appliedJobId;

      
      // Force refresh the specific job's application status by clearing cache first
      dispatch(forceRefreshApplicationStatus({ jobId: appliedJobId }));
      dispatch(checkApplicationStatus(appliedJobId));
      
      // Clear the location state to prevent repeated refreshes
      window.history.replaceState({}, document.title);
    }
  }, [dispatch, location.state]);

  // Live search effect with abort controller
  useEffect(() => {
    if (debouncedSearchTerm !== filters.search) {
      setIsSearching(true);
      dispatch(setFilters({ search: debouncedSearchTerm }));
      
      const abortController = new AbortController();
      const searchPromise = dispatch(fetchJobs({ ...filters, search: debouncedSearchTerm, page: 1 }));
      
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
    dispatch(setCurrentPage(page));
    
    // Scroll to top immediately before fetching new data
    if (jobsContainerRef.current) {
      jobsContainerRef.current.scrollTop = 0;
    } else {
      window.scrollTo(0, 0);
    }
    
    // Then fetch the new jobs
    dispatch(fetchJobs({ ...filters, page }));
  };

  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, pagination.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-center gap-2 mt-8">
        <button
          onClick={() => handlePageChange(pagination.currentPage - 1)}
          disabled={!pagination.hasPrevPage}
          className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        {pages.map(page => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-3 py-2 rounded-lg border ${
              page === pagination.currentPage
                ? 'bg-slate-900 text-white border-slate-900'
                : 'border-slate-300 hover:bg-slate-50'
            }`}
          >
            {page}
          </button>
        ))}
        
        <button
          onClick={() => handlePageChange(pagination.currentPage + 1)}
          disabled={!pagination.hasNextPage}
          className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
        >
          <ChevronRight className="w-4 h-4" />
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
            onClick={() => dispatch(fetchJobs({ page: 1 }))}
            className="bg-slate-900 text-white px-6 py-2 rounded-lg hover:bg-slate-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 h-screen overflow-hidden">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerChildren}
        className="space-y-6 h-full flex flex-col"
      >
          {/* Header */}
          <motion.div variants={fadeUp}>
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">Browse Jobs</h1>
            <p className="text-slate-600">
              Discover your next career opportunity from {pagination.totalJobs} available positions
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div variants={fadeUp}>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by job title, company, or keywords... (live search)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                />
                {(isSearching || (loading && searchTerm)) && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-slate-600"></div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(true)}
                className="px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors lg:hidden"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
            {searchTerm && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-sm text-slate-600"
              >
                {isSearching || loading ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border border-slate-300 border-t-slate-600"></div>
                    Searching...
                  </span>
                ) : (
                  `Found ${pagination.totalJobs} jobs matching "${searchTerm}"`
                )}
              </motion.div>
            )}
          </motion.div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
            {/* Filters Sidebar - Desktop */}
            <div className="hidden lg:block">
              <div className="h-full max-h-[calc(100vh-16rem)] overflow-hidden">
                <FiltersSidebar isOpen={true} isDesktop={true} onClose={() => {}} jobsContainerRef={jobsContainerRef} />
              </div>
            </div>

            {/* Jobs List */}
            <div 
              ref={jobsContainerRef}
              className="lg:col-span-3 h-full max-h-[calc(100vh-16rem)] overflow-y-auto custom-scrollbar scroll-container jobs-container lg:pr-2 relative scroll-smooth"
            >
              <AnimatePresence mode="wait">
                {isSearching && <SearchLoadingOverlay />}
              </AnimatePresence>
              
              {loading && !isSearching ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {[...Array(6)].map((_, index) => (
                    <JobCardSkeleton key={index} index={index} />
                  ))}
                </motion.div>
              ) : jobs.length === 0 ? (
                <motion.div 
                  variants={fadeUp}
                  className="text-center py-12"
                >
                  <div className="text-slate-400 mb-4">
                    <Search className="w-16 h-16 mx-auto mb-4" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No jobs found</h3>
                  <p className="text-slate-600 mb-4">
                    Try adjusting your search criteria or filters to find more opportunities.
                  </p>
                  <button
                    onClick={() => {
                      dispatch(resetFilters());
                      dispatch(fetchJobs({ page: 1 }));
                      setSearchTerm('');
                    }}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
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
                  className="space-y-4"
                >
                  <AnimatePresence mode="wait">
                    {jobs.map((job, index) => (
                      <JobCard key={job._id} job={job} index={index} />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Pagination */}
              {renderPagination()}
            </div>
          </div>
      </motion.div>

      {/* Mobile Filters */}
      <div className="lg:hidden">
        <FiltersSidebar isOpen={showFilters} isDesktop={false} onClose={() => setShowFilters(false)} jobsContainerRef={jobsContainerRef} />
      </div>
    </main>
  );
};

export default BrowseJobs;