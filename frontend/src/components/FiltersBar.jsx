import React from 'react';
import Input from './forms/Input';
import Select from './forms/Select';
import { Search } from 'lucide-react';

const statusOptions = [
  { value: 'all', label: 'All statuses' },
  { value: 'Applied', label: 'Applied' },
  { value: 'Shortlisted', label: 'Shortlisted' },
  { value: 'Interview Scheduled', label: 'Interview' },
  { value: 'Hired', label: 'Accepted' },
  { value: 'Rejected', label: 'Rejected' },
];

const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name A→Z' },
];

const FiltersBar = ({ search, setSearch, status, setStatus, sort, setSort, onApply }) => {
  return (
    <div className="flex flex-col md:flex-row gap-3 md:items-end bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex-1">
        <div className="relative">
          <Input
            name="search"
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, notes..."
            className=""
          />
          <Search className="h-4 w-4 text-slate-400 absolute right-3 top-9" />
        </div>
      </div>
      <Select
        name="status"
        label="Status"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        options={statusOptions}
        className="w-full md:w-48"
      />
      <Select
        name="sort"
        label="Sort"
        value={sort}
        onChange={(e) => setSort(e.target.value)}
        options={sortOptions}
        className="w-full md:w-48"
      />
      <button
        type="button"
        onClick={onApply}
        className="inline-flex items-center justify-center rounded-xl bg-slate-900 text-white px-4 py-2.5 text-sm hover:bg-slate-800"
      >
        Apply
      </button>
    </div>
  );
};

export default FiltersBar;