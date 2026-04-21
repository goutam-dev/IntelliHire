import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useAuth } from '@clerk/clerk-react';
import {
  fetchJobById,
  updateJob,
  updateJobStatus,
  clearJobData,
  setValidationErrors,
} from '../store/slices/jobSlice';
import { Input, Select, Textarea, TagsInput } from '../components/forms';
import EmployerHeader from '../components/layout/EmployerHeader';
import { fetchEmployerProfile } from '../store/slices/employerSlice';
import {
  JOB_CATEGORIES,
  EXPERIENCE_LEVELS,
  EXPERIENCE_LEVEL_DURATION_GUIDE,
  EMPLOYMENT_TYPES,
  EDUCATION_OPTIONS,
  CURRENCY_OPTIONS,
} from '../constants/jobConstants';

const DEPARTMENT_OPTION_VALUES = new Set(JOB_CATEGORIES.map((option) => option.value));

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const getErrorMessage = (err) => {
  if (!err) return 'Something went wrong while updating the job';
  if (typeof err === 'string') return err;
  if (typeof err?.message === 'string') return err.message;
  return 'Something went wrong while updating the job';
};

const EditJobPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    currentJob,
    currentJobLoading,
    currentJobError,
    loading,
    error,
    validationErrors,
  } = useAppSelector((state) => state.jobs);

  const [formData, setFormData] = useState({
    title: '',
    department: '',
    customDepartment: '',
    description: '',
    requiredSkills: [],
    experienceLevel: '',
    educationRequirements: '',
    location: '',
    employmentType: '',
    salaryCurrency: 'USD',
    salaryMin: '',
    salaryMax: '',
    applicationDeadline: '',
    status: 'draft',
  });
  const [touched, setTouched] = useState({});

  const { getToken } = useAuth();
  const { profile: employerProfile } = useAppSelector((state) => state.employer);
  const isDraftJob = currentJob?.status === 'draft';

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
      const existingDepartment = currentJob.department || '';
      const hasPresetDepartment = DEPARTMENT_OPTION_VALUES.has(existingDepartment);

      setFormData({
        title: currentJob.title || '',
        department: hasPresetDepartment ? existingDepartment : (existingDepartment ? 'other' : ''),
        customDepartment: hasPresetDepartment ? '' : existingDepartment,
        description: currentJob.description || '',
        requiredSkills: currentJob.requiredSkills || [],
        experienceLevel: currentJob.experienceLevel || '',
        educationRequirements: currentJob.educationRequirements || '',
        location: currentJob.location || '',
        employmentType: currentJob.employmentType || '',
        salaryCurrency: currentJob.salaryRange?.currency || 'USD',
        salaryMin: currentJob.salaryRange?.min?.toString() || '',
        salaryMax: currentJob.salaryRange?.max?.toString() || '',
        applicationDeadline: currentJob.applicationDeadline
          ? currentJob.applicationDeadline.slice(0, 10)
          : '',
        status: currentJob.status || 'draft',
      });
    }
  }, [currentJob, jobId]);

  useEffect(() => {
    if (currentJobError) {
      toast.error(getErrorMessage(currentJobError));
    }
  }, [currentJobError]);

  useEffect(() => {
    if (error) {
      toast.error(getErrorMessage(error));
    }
  }, [error]);

  const historyEntries = useMemo(() => {
    if (!currentJob) return [];
    const entries = [
      {
        label: 'Job Created',
        detail: currentJob.createdAt,
        colorClass: 'bg-indigo-500',
      },
    ];
    if (currentJob.publishedAt) {
      entries.push({
        label: 'First Published',
        detail: currentJob.publishedAt,
        colorClass: 'bg-emerald-500',
      });
    }
    if (currentJob.lastStatusChangeAt) {
      entries.push({
        label: `Status changed to ${currentJob.status}`,
        detail: currentJob.lastStatusChangeAt,
        colorClass: 'bg-amber-500',
      });
    }
    return entries;
  }, [currentJob]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === 'department') {
        return {
          ...prev,
          department: value,
          customDepartment: value === 'other' ? prev.customDepartment : '',
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
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
      case 'department':
        if (value === 'other' && (!formData.customDepartment || formData.customDepartment.trim() === '')) {
          errors.department = 'Please enter a custom department name';
        } else {
          errors.department = null;
        }
        break;
      case 'customDepartment':
        if (formData.department === 'other' && (!value || value.trim() === '')) {
          errors.department = 'Please enter a custom department name';
        } else {
          errors.department = null;
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
          // Compare as date strings (YYYY-MM-DD) to avoid UTC vs local timezone issues
          const todayStr = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD' in local time
          if (value < todayStr) {
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

  // Field order matching the form layout — used to find the first error field
  const fieldOrder = [
    'title',
    'department',
    'description',
    'requiredSkills',
    'experienceLevel',
    'educationRequirements',
    'location',
    'employmentType',
    'salaryCurrency',
    'salaryMin',
    'salaryMax',
    'applicationDeadline',
  ];

  const scrollToFirstError = (errors) => {
    for (const field of fieldOrder) {
      if (errors[field]) {
        const element = document.getElementById(field);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Small delay so scroll finishes before focusing
          setTimeout(() => element.focus(), 300);
        }
        break;
      }
    }
  };

  const validateForm = (forPublish = true) => {
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

    if (forPublish) {
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
    }

    if (formData.title && formData.title.length < 3) {
      errors.title = 'Job title must be at least 3 characters';
      isValid = false;
    }

    if (formData.description && formData.description.length < 50) {
      errors.description = 'Job description must be at least 50 characters';
      isValid = false;
    }

    if (formData.department === 'other' && (!formData.customDepartment || formData.customDepartment.trim() === '')) {
      errors.department = 'Please enter a custom department name';
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
      // Compare as date strings to avoid UTC vs local timezone issues
      const todayStr = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD' in local time
      if (formData.applicationDeadline < todayStr) {
        errors.applicationDeadline = 'Application deadline cannot be in the past';
        isValid = false;
      }
    }

    dispatch(setValidationErrors(errors));

    if (forPublish) {
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
    }

    // Scroll to the first field with an error
    if (!isValid) {
      scrollToFirstError(errors);
      const firstErrorField = fieldOrder.find((field) => errors[field]);
      const firstErrorMessage = firstErrorField
        ? errors[firstErrorField]
        : 'Please fix the highlighted form errors';
      toast.error(firstErrorMessage);
    }

    return isValid;
  };

  const handleUpdateJob = async (e) => {
    e.preventDefault();
    if (!validateForm(!isDraftJob)) return;

    const { customDepartment, ...baseFormData } = formData;

    const jobData = {
      ...baseFormData,
      status: isDraftJob ? 'draft' : (formData.status || currentJob?.status),
      department: formData.department === 'other'
        ? (formData.customDepartment.trim() || undefined)
        : (formData.department || undefined),
      salaryRange:
        formData.salaryMin || formData.salaryMax
          ? {
              min: formData.salaryMin ? parseFloat(formData.salaryMin) : undefined,
              max: formData.salaryMax ? parseFloat(formData.salaryMax) : undefined,
              currency: formData.salaryCurrency || 'USD',
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

  const handlePublishJob = async (e) => {
    e.preventDefault();
    if (!validateForm(true)) return;

    const { customDepartment, ...baseFormData } = formData;

    const jobData = {
      ...baseFormData,
      status: 'draft',
      department: formData.department === 'other'
        ? (formData.customDepartment.trim() || undefined)
        : (formData.department || undefined),
      salaryRange:
        formData.salaryMin || formData.salaryMax
          ? {
              min: formData.salaryMin ? parseFloat(formData.salaryMin) : undefined,
              max: formData.salaryMax ? parseFloat(formData.salaryMax) : undefined,
              currency: formData.salaryCurrency || 'USD',
            }
          : undefined,
      applicationDeadline: formData.applicationDeadline || undefined,
    };

    try {
      const token = await getToken();
      await dispatch(updateJob({ jobId, jobData, token })).unwrap();
      await dispatch(updateJobStatus({ jobId, status: 'active', token })).unwrap();
      navigate('/employer/jobs');
    } catch (err) {
      console.error('Failed to publish job', err);
    }
  };

  const handleCancel = () => {
    navigate('/employer/jobs');
  };

  const renderForm = () => (
    <form className="space-y-8" onSubmit={handleUpdateJob}>
      {/* Top Meta Info */}
      <div className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-2 shadow-sm">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
            Job ID
          </p>
          <p className="mt-1 font-mono text-sm text-zinc-800 break-all bg-zinc-50 py-1.5 px-3 rounded-md w-max">
            {currentJob?._id}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
            Created At
          </p>
          <p className="mt-1 text-sm text-zinc-800 flex items-center h-[34px]">
            {currentJob?.createdAt
              ? new Date(currentJob.createdAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })
              : '—'}
          </p>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column - Forms */}
        <div className="space-y-8 lg:col-span-2">
          {/* Basic Information */}
          <div className="bg-white rounded-2xl border border-zinc-200 relative overflow-hidden p-6 shadow-md shadow-zinc-200/50">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-6">Basic Information</h2>
            <div className="space-y-6">
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

              <div className="grid gap-6 sm:grid-cols-2">
                <Select
                  label="Department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  onBlur={() => handleBlur('department')}
                  error={
                    touched.department && formData.department !== 'other'
                      ? validationErrors.department
                      : null
                  }
                  placeholder="Select department"
                  options={JOB_CATEGORIES}
                />

                {formData.department === 'other' ? (
                  <Input
                    label="Custom Department"
                    name="customDepartment"
                    type="text"
                    value={formData.customDepartment}
                    onChange={handleChange}
                    onBlur={() => handleBlur('customDepartment')}
                    error={touched.customDepartment ? validationErrors.department : null}
                    placeholder="Enter custom department name"
                  />
                ) : <div className="hidden sm:block"></div>}
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
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
              </div>
            </div>
          </div>

          {/* Details & Requirements */}
          <div className="bg-white rounded-2xl border border-zinc-200 relative overflow-hidden p-6 shadow-md shadow-zinc-200/50">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-6">Details & Requirements</h2>
            <div className="space-y-6">
              <Textarea
                label="Job Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                onBlur={() => handleBlur('description')}
                error={touched.description ? validationErrors.description : null}
                required
                rows={6}
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

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <Select
                    label="Experience Level"
                    name="experienceLevel"
                    value={formData.experienceLevel}
                    onChange={handleChange}
                    onBlur={() => handleBlur('experienceLevel')}
                    error={touched.experienceLevel ? validationErrors.experienceLevel : null}
                    required
                    placeholder="Select experience level"
                    options={EXPERIENCE_LEVELS}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                    <span className="font-medium mr-1">Guide:</span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-700 border border-zinc-200">Entry: {EXPERIENCE_LEVEL_DURATION_GUIDE.entry}</span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-700 border border-zinc-200">Mid: {EXPERIENCE_LEVEL_DURATION_GUIDE.mid}</span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-700 border border-zinc-200">Senior: {EXPERIENCE_LEVEL_DURATION_GUIDE.senior}</span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-700 border border-zinc-200">Expert: {EXPERIENCE_LEVEL_DURATION_GUIDE.expert}</span>
                  </div>
                </div>

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
              </div>
            </div>
          </div>

          {/* Compensation & Timeline */}
          <div className="bg-white rounded-2xl border border-zinc-200 relative overflow-hidden p-6 shadow-md shadow-zinc-200/50">
            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
            <h2 className="text-lg font-semibold text-zinc-900 mb-6">Compensation & Timeline</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              <Select
                label="Currency"
                name="salaryCurrency"
                value={formData.salaryCurrency}
                onChange={handleChange}
                placeholder="Select currency"
                options={CURRENCY_OPTIONS}
              />
              <Input
                label="Salary Minimum"
                name="salaryMin"
                type="number"
                value={formData.salaryMin}
                onChange={handleChange}
                onBlur={() => handleBlur('salaryMin')}
                error={touched.salaryMin ? validationErrors.salaryMin : null}
                placeholder="e.g., 50000"
              />
              <Input
                label="Salary Maximum"
                name="salaryMax"
                type="number"
                value={formData.salaryMax}
                onChange={handleChange}
                onBlur={() => handleBlur('salaryMax')}
                error={touched.salaryMax ? validationErrors.salaryMax : null}
                placeholder="e.g., 100000"
              />
              
              <div className="sm:col-span-3 border-t border-zinc-100 pt-6 mt-2">
                <div className="sm:max-w-xs">
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
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Status & History Sidebars */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm sticky top-6">
            <p className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Change History
            </p>
            {historyEntries.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No change history available yet.
              </p>
            ) : (
              <div className="pt-2">
                {historyEntries.map((entry, idx) => (
                  <div
                    key={`${entry.label}-${idx}`}
                    className={`relative pl-5 ${idx === historyEntries.length - 1 ? 'border-transparent' : 'border-zinc-200'} border-l-2 pb-5 last:pb-0`}
                  >
                    <div className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full ${entry.colorClass || 'bg-zinc-300'} ring-4 ring-white`}></div>
                    <p className="text-sm font-medium text-zinc-800 leading-tight">
                      {entry.label}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {entry.detail ? new Date(entry.detail).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      }) : '—'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 rounded-2xl bg-white border border-zinc-200 p-4 shadow-sm sm:flex-row sm:justify-end sticky bottom-6 z-10 w-full mt-8">
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-6 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
        >
          Cancel
        </button>
        {isDraftJob ? (
          <>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-6 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="button"
              onClick={handlePublishJob}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Publishing...' : 'Publish Job'}
            </button>
          </>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      <EmployerHeader 
        userName={employerProfile?.user?.fullName || 'User'}
        companyName={employerProfile?.companyName || 'Company'}
      />
      <div className="max-w-6xl mx-auto px-4 pt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Edit Job Posting
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Update the details, requirements, and settings of your job posting.
          </p>
        </div>

        {currentJobError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-8">
            <p className="text-sm font-medium text-red-800">{currentJobError}</p>
          </div>
        )}

        {currentJobLoading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm font-medium text-zinc-500 shadow-sm">
            Loading job data...
          </div>
        ) : currentJob ? (
          <motion.div
             initial={{ opacity: 0, y: 16 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.3 }}
          >
             {renderForm()}
          </motion.div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm font-medium text-zinc-500 shadow-sm">
            Job not found.
          </div>
        )}
      </div>

    </div>
  );
};

export default EditJobPage;

