import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useAuth } from '@clerk/clerk-react';
import {
  fetchJobById,
  updateJob,
  clearJobData,
  setValidationErrors,
} from '../store/slices/jobSlice';
import { Input, Select, Textarea, TagsInput } from '../components/forms';
import EmployerHeader from '../components/layout/EmployerHeader';

import { fetchEmployerProfile } from '../store/slices/employerSlice';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const JOB_CATEGORIES = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'hr', label: 'HR' },
  { value: 'design', label: 'Design' },
  { value: 'product', label: 'Product' },
  { value: 'operations', label: 'Operations' },
  { value: 'finance', label: 'Finance' },
  { value: 'customer-support', label: 'Customer Support' },
  { value: 'other', label: 'Other' },
];

const EXPERIENCE_LEVELS = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid-Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'expert', label: 'Expert' },
];

const EMPLOYMENT_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'remote', label: 'Remote' },
];

const EDUCATION_OPTIONS = [
  { value: '', label: 'Select education requirement' },
  { value: 'high-school', label: 'High School' },
  { value: 'associate', label: "Associate's Degree" },
  { value: 'bachelor', label: "Bachelor's Degree" },
  { value: 'master', label: "Master's Degree" },
  { value: 'phd', label: 'PhD' },
  { value: 'none', label: 'No specific requirement' },
];

const EditJobPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    currentJob,
    currentJobLoading,
    currentJobError,
    loading,
    validationErrors,
  } = useAppSelector((state) => state.jobs);

  const [formData, setFormData] = useState({
    title: '',
    department: '',
    description: '',
    requiredSkills: [],
    experienceLevel: '',
    educationRequirements: '',
    location: '',
    employmentType: '',
    salaryMin: '',
    salaryMax: '',
    applicationDeadline: '',
    status: 'draft',
  });
  const [touched, setTouched] = useState({});

  const { getToken } = useAuth();
  const { profile: employerProfile } = useAppSelector((state) => state.employer);

  useEffect(() => {
    const loadJob = async () => {
      const token = await getToken();
      dispatch(fetchEmployerProfile({ token }));
      dispatch(fetchJobById(jobId));
    };
    loadJob();
    return () => {
      dispatch(clearJobData());
    };
  }, [dispatch, jobId, getToken]);

  useEffect(() => {
    if (currentJob?._id === jobId) {
      setFormData({
        title: currentJob.title || '',
        department: currentJob.department || '',
        description: currentJob.description || '',
        requiredSkills: currentJob.requiredSkills || [],
        experienceLevel: currentJob.experienceLevel || '',
        educationRequirements: currentJob.educationRequirements || '',
        location: currentJob.location || '',
        employmentType: currentJob.employmentType || '',
        salaryMin: currentJob.salaryRange?.min?.toString() || '',
        salaryMax: currentJob.salaryRange?.max?.toString() || '',
        applicationDeadline: currentJob.applicationDeadline
          ? currentJob.applicationDeadline.slice(0, 10)
          : '',
        status: currentJob.status || 'draft',
      });
    }
  }, [currentJob, jobId]);

  const historyEntries = useMemo(() => {
    if (!currentJob) return [];
    const entries = [
      {
        label: 'Job Created',
        detail: currentJob.createdAt,
      },
    ];
    if (currentJob.publishedAt) {
      entries.push({
        label: 'First Published',
        detail: currentJob.publishedAt,
      });
    }
    if (currentJob.lastStatusChangeAt) {
      entries.push({
        label: `Status changed to ${currentJob.status}`,
        detail: currentJob.lastStatusChangeAt,
      });
    }
    return entries;
  }, [currentJob]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (validationErrors[name]) {
      dispatch(
        setValidationErrors({
          ...validationErrors,
          [name]: null,
        })
      );
    }
  };

  const handleTagsChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (validationErrors[name]) {
      dispatch(
        setValidationErrors({
          ...validationErrors,
          [name]: null,
        })
      );
    }
  };

  const handleBlur = (fieldName) => {
    setTouched((prev) => ({
      ...prev,
      [fieldName]: true,
    }));
    validateField(fieldName, formData[fieldName]);
  };

  const validateField = (fieldName, value) => {
    const errors = { ...validationErrors };

    switch (fieldName) {
      case 'title':
        if (!value || value.trim() === '') {
          errors.title = 'Job title is required';
        } else if (value.length < 3) {
          errors.title = 'Job title must be at least 3 characters';
        } else {
          errors.title = null;
        }
        break;
      case 'description':
        if (!value || value.trim() === '') {
          errors.description = 'Job description is required';
        } else if (value.length < 50) {
          errors.description = 'Job description must be at least 50 characters';
        } else {
          errors.description = null;
        }
        break;
      case 'requiredSkills':
        if (!value || value.length === 0) {
          errors.requiredSkills = 'At least one skill is required';
        } else {
          errors.requiredSkills = null;
        }
        break;
      case 'experienceLevel':
        if (!value || value === '') {
          errors.experienceLevel = 'Experience level is required';
        } else {
          errors.experienceLevel = null;
        }
        break;
      case 'location':
        if (!value || value.trim() === '') {
          errors.location = 'Job location is required';
        } else {
          errors.location = null;
        }
        break;
      case 'employmentType':
        if (!value || value === '') {
          errors.employmentType = 'Employment type is required';
        } else {
          errors.employmentType = null;
        }
        break;
      case 'salaryMin':
        if (value && (isNaN(value) || parseFloat(value) < 0)) {
          errors.salaryMin = 'Salary must be a valid positive number';
        } else if (
          value &&
          formData.salaryMax &&
          parseFloat(value) > parseFloat(formData.salaryMax)
        ) {
          errors.salaryMin = 'Minimum salary cannot exceed maximum salary';
        } else {
          errors.salaryMin = null;
        }
        break;
      case 'salaryMax':
        if (value && (isNaN(value) || parseFloat(value) < 0)) {
          errors.salaryMax = 'Salary must be a valid positive number';
        } else if (
          value &&
          formData.salaryMin &&
          parseFloat(value) < parseFloat(formData.salaryMin)
        ) {
          errors.salaryMax = 'Maximum salary cannot be less than minimum salary';
        } else {
          errors.salaryMax = null;
        }
        break;
      case 'applicationDeadline':
        if (value) {
          const deadlineDate = new Date(value);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (deadlineDate < today) {
            errors.applicationDeadline =
              'Application deadline cannot be in the past';
          } else {
            errors.applicationDeadline = null;
          }
        }
        break;
      default:
        break;
    }

    dispatch(setValidationErrors(errors));
  };

  const validateForm = () => {
    const requiredFields = [
      'title',
      'description',
      'requiredSkills',
      'experienceLevel',
      'location',
      'employmentType',
    ];

    const errors = {};
    let isValid = true;

    requiredFields.forEach((field) => {
      const value = formData[field];
      if (
        !value ||
        (Array.isArray(value) && value.length === 0) ||
        value === ''
      ) {
        errors[field] = `${
          field === 'requiredSkills'
            ? 'Skills'
            : field.charAt(0).toUpperCase() + field.slice(1)
        } is required`;
        isValid = false;
      }
    });

    if (formData.title && formData.title.length < 3) {
      errors.title = 'Job title must be at least 3 characters';
      isValid = false;
    }

    if (formData.description && formData.description.length < 50) {
      errors.description = 'Job description must be at least 50 characters';
      isValid = false;
    }

    if (formData.salaryMin && (isNaN(formData.salaryMin) || parseFloat(formData.salaryMin) < 0)) {
      errors.salaryMin = 'Salary must be a valid positive number';
      isValid = false;
    }

    if (formData.salaryMax && (isNaN(formData.salaryMax) || parseFloat(formData.salaryMax) < 0)) {
      errors.salaryMax = 'Salary must be a valid positive number';
      isValid = false;
    }

    if (
      formData.salaryMin &&
      formData.salaryMax &&
      parseFloat(formData.salaryMin) > parseFloat(formData.salaryMax)
    ) {
      errors.salaryMin = 'Minimum salary cannot be greater than maximum salary';
      isValid = false;
    }

    if (formData.applicationDeadline) {
      const deadlineDate = new Date(formData.applicationDeadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadlineDate < today) {
        errors.applicationDeadline = 'Application deadline cannot be in the past';
        isValid = false;
      }
    }

    dispatch(setValidationErrors(errors));

    setTouched({
      title: true,
      department: true,
      description: true,
      requiredSkills: true,
      experienceLevel: true,
      educationRequirements: true,
      location: true,
      employmentType: true,
      salaryMin: true,
      salaryMax: true,
      applicationDeadline: true,
      status: true,
    });

    return isValid;
  };

  const handleUpdateJob = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const jobData = {
      ...formData,
      salaryRange:
        formData.salaryMin || formData.salaryMax
          ? {
              min: formData.salaryMin ? parseFloat(formData.salaryMin) : undefined,
              max: formData.salaryMax ? parseFloat(formData.salaryMax) : undefined,
              currency: 'USD',
            }
          : undefined,
      applicationDeadline: formData.applicationDeadline || undefined,
    };

    try {
      const token = await getToken();
      await dispatch(updateJob({ jobId, jobData, token })).unwrap();
      navigate('/employer/jobs');
    } catch (err) {
      console.error('Failed to update job', err);
    }
  };

  const handleCancel = () => {
    navigate('/employer/jobs');
  };

  const renderForm = () => (
    <form className="space-y-6" onSubmit={handleUpdateJob}>
      <div className="grid gap-6">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              Job ID
            </p>
            <p className="mt-1 font-mono text-sm text-slate-800 break-all">
              {currentJob?._id}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">
              Created At
            </p>
            <p className="mt-1 text-sm text-slate-800">
              {currentJob?.createdAt
                ? new Date(currentJob.createdAt).toLocaleString()
                : '—'}
            </p>
          </div>
        </div>

        <Input
          label="Job Title"
          name="title"
          type="text"
          value={formData.title}
          onChange={handleChange}
          onBlur={() => handleBlur('title')}
          error={touched.title ? validationErrors.title : null}
          required
          placeholder="e.g., Senior Software Engineer"
        />

        <Select
          label="Job Category/Department"
          name="department"
          value={formData.department}
          onChange={handleChange}
          onBlur={() => handleBlur('department')}
          error={touched.department ? validationErrors.department : null}
          placeholder="Select department"
          options={JOB_CATEGORIES}
        />

        <Textarea
          label="Job Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          onBlur={() => handleBlur('description')}
          error={touched.description ? validationErrors.description : null}
          required
          rows={8}
          placeholder="Provide a detailed description..."
        />

        <TagsInput
          label="Required Skills"
          name="requiredSkills"
          value={formData.requiredSkills}
          onChange={handleTagsChange}
          onBlur={() => handleBlur('requiredSkills')}
          error={touched.requiredSkills ? validationErrors.requiredSkills : null}
          required
          placeholder="Type a skill and press Enter"
        />

        <Select
          label="Required Experience Level"
          name="experienceLevel"
          value={formData.experienceLevel}
          onChange={handleChange}
          onBlur={() => handleBlur('experienceLevel')}
          error={touched.experienceLevel ? validationErrors.experienceLevel : null}
          required
          placeholder="Select experience level"
          options={EXPERIENCE_LEVELS}
        />

        <Select
          label="Education Requirements"
          name="educationRequirements"
          value={formData.educationRequirements}
          onChange={handleChange}
          onBlur={() => handleBlur('educationRequirements')}
          error={
            touched.educationRequirements
              ? validationErrors.educationRequirements
              : null
          }
          placeholder="Select education requirement"
          options={EDUCATION_OPTIONS}
        />

        <Input
          label="Job Location"
          name="location"
          type="text"
          value={formData.location}
          onChange={handleChange}
          onBlur={() => handleBlur('location')}
          error={touched.location ? validationErrors.location : null}
          required
          placeholder="e.g., San Francisco, CA or Remote"
        />

        <Select
          label="Employment Type"
          name="employmentType"
          value={formData.employmentType}
          onChange={handleChange}
          onBlur={() => handleBlur('employmentType')}
          error={touched.employmentType ? validationErrors.employmentType : null}
          required
          placeholder="Select employment type"
          options={EMPLOYMENT_TYPES}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Salary Range (Min)"
            name="salaryMin"
            type="number"
            value={formData.salaryMin}
            onChange={handleChange}
            onBlur={() => handleBlur('salaryMin')}
            error={touched.salaryMin ? validationErrors.salaryMin : null}
            placeholder="e.g., 50000"

          />
          <Input
            label="Salary Range (Max)"
            name="salaryMax"
            type="number"
            value={formData.salaryMax}
            onChange={handleChange}
            onBlur={() => handleBlur('salaryMax')}
            error={touched.salaryMax ? validationErrors.salaryMax : null}
            placeholder="e.g., 100000"
          />
        </div>

        <Input
          label="Application Deadline"
          name="applicationDeadline"
          type="date"
          value={formData.applicationDeadline}
          onChange={handleChange}
          onBlur={() => handleBlur('applicationDeadline')}
          error={
            touched.applicationDeadline
              ? validationErrors.applicationDeadline
              : null
          }
        />
      </div>

      <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Change History</p>
        {historyEntries.length === 0 && (
          <p className="text-sm text-slate-500">
            No change history available yet.
          </p>
        )}
        <div className="space-y-3">
          {historyEntries.map((entry, idx) => (
            <div
              key={`${entry.label}-${idx}`}
              className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <p className="text-sm font-medium text-slate-800">
                {entry.label}
              </p>
              <p className="text-xs text-slate-500">
                {entry.detail ? new Date(entry.detail).toLocaleString() : '—'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Update Job'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <EmployerHeader 
        userName={employerProfile?.user?.fullName || 'User'}
        companyName={employerProfile?.companyName || 'Company'}
      />
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* existing content and form rendering */}
        {currentJobLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Loading job data...
          </div>
        ) : currentJob ? (
          renderForm()
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Job not found.
          </div>
        )}
      </div>

    </div>
  );
};

export default EditJobPage;

