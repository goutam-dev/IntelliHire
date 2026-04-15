// frontend/src/components/candidate/profile/ExperienceSection.jsx
import React, { useState } from 'react';
import { toast } from 'react-toastify';

const ExperienceSection = ({ profile, onAdd, onDelete }) => {
  const today = new Date();
  const maxMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    companyName: '',
    location: '',
    startDate: '',
    endDate: '',
    currentlyWorking: false,
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const resetForm = () => {
    setFormData({
      title: '',
      companyName: '',
      location: '',
      startDate: '',
      endDate: '',
      currentlyWorking: false,
      description: ''
    });
    setShowForm(false);
    setErrors({});
    setSubmitError('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    setErrors((prev) => ({ ...prev, [name]: null }));
    setSubmitError('');
  };

  const handleMarkNoExperience = async () => {
    if (!window.confirm('Mark profile as fresher with no work experience?')) return;

    setSaving(true);
    setSubmitError('');
    try {
      await onAdd({ experienceType: 'none' });
      toast.success('Profile marked as fresher (no work experience)');
    } catch (error) {
      const message = error?.message || error || 'Failed to save preference';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};

    if (!formData.title) {
      newErrors.title = 'Job title is required';
    }

    if (!formData.companyName) {
      newErrors.companyName = 'Company name is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    const startDate = formData.startDate ? new Date(`${formData.startDate}-01`) : null;
    const todayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    if (startDate && startDate > todayMonth) {
      newErrors.startDate = 'Start date cannot be in the future';
    }

    if (!formData.currentlyWorking && !formData.endDate) {
      newErrors.endDate = 'End date is required if not currently working';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Validate dates if provided
    if (formData.startDate && formData.endDate && !formData.currentlyWorking) {
      const startDate = new Date(`${formData.startDate}-01`);
      const endDate = new Date(`${formData.endDate}-01`);
      
      if (endDate <= startDate) {
        setErrors((prev) => ({ ...prev, endDate: 'End date must be after start date' }));
        return;
      }
    }

    setSaving(true);
    setSubmitError('');
    try {
      const submitData = {
        ...formData,
        endDate: formData.currentlyWorking ? null : formData.endDate,
        experienceType: 'specific'
      };
      
      await onAdd(submitData);
      toast.success('Work experience added successfully');
      resetForm();
    } catch (error) {
      const message = error?.message || error || 'Failed to add work experience';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (experienceId) => {
    if (window.confirm('Are you sure you want to delete this work experience?')) {
      try {
        await onDelete(experienceId);
        toast.success('Work experience deleted successfully');
      } catch (error) {
        console.error('Delete experience error:', error);
        toast.error('Failed to delete work experience');
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const calculateDuration = (startDate, endDate, currentlyWorking) => {
    if (!startDate) return '';
    
    const start = new Date(startDate);
    const end = currentlyWorking ? new Date() : new Date(endDate);
    
    const diffTime = Math.abs(end - start);
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.44));
    
    if (diffMonths < 12) {
      return `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(diffMonths / 12);
      const months = diffMonths % 12;
      let duration = `${years} year${years !== 1 ? 's' : ''}`;
      if (months > 0) {
        duration += ` ${months} month${months !== 1 ? 's' : ''}`;
      }
      return duration;
    }
  };

  const experienceList = profile?.experience || [];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-zinc-900">Work Experience</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors"
        >
          Add Experience
        </button>
      </div>

      {/* Experience List */}
      <div className="space-y-4 mb-6">
        {experienceList.length === 0 ? (
          <div className="text-center py-8 bg-zinc-50 rounded-2xl border border-zinc-200">
            <svg className="mx-auto h-12 w-12 text-zinc-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2V6" />
            </svg>
            <h3 className="text-lg font-medium text-zinc-900 mb-2">No Work Experience Added</h3>
            <p className="text-zinc-600 mb-4">Add your professional experience to showcase your career journey</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-colors"
              >
                Add Your First Experience
              </button>
              <button
                onClick={handleMarkNoExperience}
                disabled={saving}
                className="px-4 py-2 border border-zinc-300 text-zinc-700 rounded-xl hover:bg-zinc-100 transition-colors disabled:opacity-50"
              >
                I am a Fresher (No Experience)
              </button>
            </div>
          </div>
        ) : (
          experienceList.map((experience) => (
            <div key={experience._id} className="bg-white border border-zinc-200 rounded-2xl p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-zinc-900">{experience.title}</h3>
                  <p className="text-zinc-900 font-medium">{experience.companyName}</p>
                  {experience.location && (
                    <p className="text-zinc-600">{experience.location}</p>
                  )}
                  <div className="flex items-center text-sm text-zinc-500 mt-1">
                    <span>
                      {formatDate(experience.startDate)} - {
                        experience.currentlyWorking 
                          ? 'Present' 
                          : experience.endDate 
                            ? formatDate(experience.endDate)
                            : 'Present'
                      }
                    </span>
                    {experience.startDate && (
                      <span className="ml-2 text-zinc-400">
                        • {calculateDuration(experience.startDate, experience.endDate, experience.currentlyWorking)}
                      </span>
                    )}
                  </div>
                  {experience.description && (
                    <div className="mt-3">
                      <p className="text-zinc-700 whitespace-pre-line">{experience.description}</p>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleDelete(experience._id)}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Experience Form */}
      {showForm && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-zinc-900 mb-4">Add Work Experience</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Job Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g., Software Engineer, Marketing Manager"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="e.g., Google, Microsoft, Startup Inc."
                  className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Location
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., San Francisco, CA or Remote"
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Start Date
                </label>
                <input
                  type="month"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  max={maxMonth}
                  className={`w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 ${errors.startDate ? 'border-red-300' : 'border-zinc-300'}`}
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  End Date
                </label>
                <input
                  type="month"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  max={maxMonth}
                  disabled={formData.currentlyWorking}
                  className={`w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 disabled:bg-zinc-100 disabled:cursor-not-allowed ${errors.endDate ? 'border-red-300' : 'border-zinc-300'}`}
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
                )}
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="currentlyWorking"
                checked={formData.currentlyWorking}
                onChange={handleChange}
                className="h-4 w-4 text-zinc-900 focus:ring-zinc-900 border-zinc-300 rounded"
              />
              <label className="ml-2 text-sm text-zinc-700">
                I currently work here
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Description/Responsibilities
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                placeholder="Describe your key responsibilities, achievements, and impact in this role..."
                className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Tip: Use bullet points and quantify your achievements with numbers when possible
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="px-4 py-2 text-zinc-700 bg-white border border-zinc-300 rounded-xl hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {saving ? 'Adding...' : 'Add Experience'}
              </button>
            </div>

            {submitError && (
              <p className="text-sm text-red-600">{submitError}</p>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

export default ExperienceSection;