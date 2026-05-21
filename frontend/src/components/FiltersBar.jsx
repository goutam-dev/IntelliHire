import React from 'react';
import Input from './forms/Input';
import Select from './forms/Select';
import { Search } from 'lucide-react';

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'Applied', label: 'Applied' },
  { value: 'Shortlisted', label: 'Shortlisted' },
  { value: 'Interview Scheduled', label: 'Interview Scheduled' },
  { value: 'Interviewed', label: 'Interviewed' },
  { value: 'Finalist', label: 'Finalist' },
  { value: 'Hired', label: 'Accepted' },
  { value: 'Rejected', label: 'Rejected' },
];

const sortOptions = [
  { value: 'ai_score', label: 'AI resume score high-low' },
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name A→Z' },
];

const resumeGradeOptions = [
  { value: 'all', label: 'All grades' },
  { value: 'Excellent', label: 'Excellent' },
  { value: 'Good', label: 'Good' },
  { value: 'Average', label: 'Average' },
  { value: 'Poor', label: 'Poor' },
  { value: 'not_analyzed', label: 'Not analyzed' },
];

const FiltersBar = ({ search, setSearch, status, setStatus, sort, setSort, resumeGrade, setResumeGrade }) => {
  return (
    <div className="flex flex-col lg:flex-row gap-3 items-center w-full">
      <div className="flex-1 w-full">
        <div className="relative">
          <Input
            name="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates by name..."
            style={{ paddingRight: '2.5rem' }}
          />
          <Search className="h-4 w-4 text-zinc-400 absolute right-4 top-[13px]" />
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
        <Select
          name="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={statusOptions}
          className="w-full sm:w-44"
        />
        <Select
          name="resumeGrade"
          value={resumeGrade}
          onChange={(e) => setResumeGrade(e.target.value)}
          options={resumeGradeOptions}
          className="w-full sm:w-44"
        />
        <Select
          name="sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          options={sortOptions}
          className="w-full sm:w-44"
        />
      </div>
    </div>
  );
};

export default FiltersBar;