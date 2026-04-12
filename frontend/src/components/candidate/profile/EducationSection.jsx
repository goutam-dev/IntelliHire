// frontend/src/components/candidate/profile/EducationSection.jsx
import React, { useState } from 'react';
import { toast } from 'react-toastify';

const DEGREE_OPTIONS = [
  'High School',
  "Associate's Degree",
  "Bachelor's Degree",
  "Master's Degree",
  'Doctoral Degree (PhD)',
  'Professional Degree',
  'Diploma',
  'Certificate',
  'Other'
];

const EducationSection = ({ profile, onAdd, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    degree: '',
    fieldOfStudy: '',
    institution: '',
    startDate: '',
    endDate: '',
    currentlyEnrolled: false,
    grade: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const currentMonth = new Date().toISOString().slice(0, 7);

  const resetForm = () => {
    setFormData({
      degree: '',
      fieldOfStudy: '',
      institution: '',
      startDate: '',
      endDate: '',
      currentlyEnrolled: false,
      grade: '',
      description: ''
    });
    setShowForm(false);
    setEditingId(null);
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.degree || !formData.fieldOfStudy || !formData.institution || !formData.startDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newErrors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(formData.startDate);
    startDate.setHours(0, 0, 0, 0);

    if (Number.isNaN(startDate.getTime())) {
      newErrors.startDate = 'Start date is invalid';
    } else if (startDate > today) {
      newErrors.startDate = 'Start date cannot be in the future';
    }

    if (!formData.currentlyEnrolled) {
      if (!formData.endDate) {
        newErrors.endDate = 'End date is required if not currently enrolled';
      } else {
        const endDate = new Date(formData.endDate);
        endDate.setHours(0, 0, 0, 0);

        if (Number.isNaN(endDate.getTime())) {
          newErrors.endDate = 'End date is invalid';
        } else if (endDate > today) {
          newErrors.endDate = 'End date cannot be in the future';
        } else if (!Number.isNaN(startDate.getTime()) && endDate <= startDate) {
          newErrors.endDate = 'End date must be after start date';
        }
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fix the date errors');
      return;
    }

    setSaving(true);
    try {
      const submitData = {
        ...formData,
        endDate: formData.currentlyEnrolled ? null : formData.endDate
      };
      
      await onAdd(submitData);
      toast.success('Education added successfully');
      resetForm();
    } catch (error) {
      console.error('Add education error:', error);
      toast.error('Failed to add education');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (educationId) => {
    if (window.confirm('Are you sure you want to delete this education entry?')) {
      try {
        await onDelete(educationId);
        toast.success('Education deleted successfully');
      } catch (error) {
        console.error('Delete education error:', error);
        toast.error('Failed to delete education');
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const educationList = profile?.education || [];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Education</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Add Education
        </button>
      </div>

      {/* Education List */}
      <div className="space-y-4 mb-6">
        {educationList.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Education Added</h3>
            <p className="text-gray-600 mb-4">Add your educational background to showcase your qualifications</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Your First Education
            </button>
          </div>
        ) : (
          educationList.map((education) => (
            <div key={education._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{education.degree}</h3>
                  <p className="text-blue-600 font-medium">{education.fieldOfStudy}</p>
                  <p className="text-gray-600">{education.institution}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDate(education.startDate)} - {
                      education.currentlyEnrolled 
                        ? 'Present' 
                        : education.endDate 
                          ? formatDate(education.endDate)
                          : 'Present'
                    }
                  </p>
                  {education.grade && (
                    <p className="text-sm text-gray-600 mt-1">Grade: {education.grade}</p>
                  )}
                  {education.description && (
                    <p className="text-sm text-gray-600 mt-2">{education.description}</p>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleDelete(education._id)}
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

      {/* Add Education Form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Education</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Degree/Qualification *
                </label>
                <select
                  name="degree"
                  value={formData.degree}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select degree</option>
                  {DEGREE_OPTIONS.map((degree) => (
                    <option key={degree} value={degree}>
                      {degree}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field of Study *
                </label>
                <input
                  type="text"
                  name="fieldOfStudy"
                  value={formData.fieldOfStudy}
                  onChange={handleChange}
                  placeholder="e.g., Computer Science, Business Administration"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Institution Name *
              </label>
              <input
                type="text"
                name="institution"
                value={formData.institution}
                onChange={handleChange}
                placeholder="e.g., University of California, Berkeley"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="month"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  max={currentMonth}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.startDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="month"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  max={currentMonth}
                  disabled={formData.currentlyEnrolled}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    errors.endDate ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
                )}
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="currentlyEnrolled"
                checked={formData.currentlyEnrolled}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                Currently pursuing this degree
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grade/GPA (Optional)
              </label>
              <input
                type="text"
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                placeholder="e.g., 3.8/4.0, First Class, 85%"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Relevant coursework, achievements, or activities..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {saving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                Add Education
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default EducationSection;