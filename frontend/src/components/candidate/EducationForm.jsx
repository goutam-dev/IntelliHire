import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { X, GraduationCap, Calendar, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { addEducation } from '../../store/slices/candidateSlice';
import { fetchProfileCompletion } from '../../store/slices/profileCompletionSlice';

const EducationForm = ({ onClose, onSuccess, editData = null }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.candidate);
  
  const [formData, setFormData] = useState({
    degree: editData?.degree || '',
    fieldOfStudy: editData?.fieldOfStudy || '',
    institution: editData?.institution || '',
    startDate: editData?.startDate ? new Date(editData.startDate).toISOString().split('T')[0] : '',
    endDate: editData?.endDate ? new Date(editData.endDate).toISOString().split('T')[0] : '',
    currentlyEnrolled: editData?.currentlyEnrolled || false,
    grade: editData?.grade || '',
    description: editData?.description || ''
  });
  
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const todayIso = new Date().toISOString().split('T')[0];

  const degreeOptions = [
    'High School Diploma',
    'Associate Degree',
    'Bachelor\'s Degree',
    'Master\'s Degree',
    'Doctoral Degree (PhD)',
    'Professional Degree',
    'Certificate',
    'Diploma',
    'Other'
  ];

  const validateForm = () => {
    const newErrors = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!formData.degree.trim()) {
      newErrors.degree = 'Degree is required';
    }
    
    if (!formData.fieldOfStudy.trim()) {
      newErrors.fieldOfStudy = 'Field of study is required';
    }
    
    if (!formData.institution.trim()) {
      newErrors.institution = 'Institution is required';
    }
    
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    } else {
      const startDate = new Date(formData.startDate);
      startDate.setHours(0, 0, 0, 0);

      if (Number.isNaN(startDate.getTime())) {
        newErrors.startDate = 'Start date is invalid';
      } else if (startDate > today) {
        newErrors.startDate = 'Start date cannot be in the future';
      }
    }
    
    if (!formData.currentlyEnrolled && !formData.endDate) {
      newErrors.endDate = 'End date is required if not currently enrolled';
    }
    
    if (formData.endDate && !formData.currentlyEnrolled) {
      const endDate = new Date(formData.endDate);
      endDate.setHours(0, 0, 0, 0);

      if (Number.isNaN(endDate.getTime())) {
        newErrors.endDate = 'End date is invalid';
      } else if (endDate > today) {
        newErrors.endDate = 'End date cannot be in the future';
      } else if (formData.startDate) {
        const startDate = new Date(formData.startDate);
        startDate.setHours(0, 0, 0, 0);
        if (!Number.isNaN(startDate.getTime()) && endDate <= startDate) {
          newErrors.endDate = 'End date must be after start date';
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitError(null);
      
      const educationData = {
        ...formData,
        startDate: new Date(formData.startDate),
        endDate: formData.currentlyEnrolled ? null : new Date(formData.endDate)
      };
      
      await dispatch(addEducation(educationData)).unwrap();
      
      // Refresh profile completion
      await dispatch(fetchProfileCompletion());
      
      setSubmitSuccess(true);
      
      setTimeout(() => {
        onSuccess && onSuccess();
        onClose && onClose();
      }, 1500);
      
    } catch (error) {
      setSubmitError(error.message || 'Failed to add education');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-2 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => {
            if (!loading && !submitSuccess) {
              onClose && onClose();
            }
          }}
        />
        
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-2xl mx-auto max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-gray-200"
        >
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-lg mr-3">
                <GraduationCap className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {editData ? 'Edit Education' : 'Add Education'}
              </h2>
            </div>
            <button
              onClick={() => {
                if (!loading && !submitSuccess) {
                  onClose && onClose();
                }
              }}
              disabled={loading || submitSuccess}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

        {/* Success Message */}
        <AnimatePresence>
          {submitSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center"
            >
              <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
              <div>
                <p className="text-green-800 font-medium">Education added successfully!</p>
                <p className="text-green-700 text-sm">Your profile completion has been updated.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Degree */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Degree *
            </label>
            <select
              name="degree"
              value={formData.degree}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.degree ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select a degree</option>
              {degreeOptions.map((degree) => (
                <option key={degree} value={degree}>
                  {degree}
                </option>
              ))}
            </select>
            {errors.degree && (
              <p className="mt-1 text-sm text-red-600">{errors.degree}</p>
            )}
          </div>

          {/* Field of Study */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Field of Study *
            </label>
            <input
              type="text"
              name="fieldOfStudy"
              value={formData.fieldOfStudy}
              onChange={handleInputChange}
              placeholder="e.g., Computer Science, Business Administration"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.fieldOfStudy ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.fieldOfStudy && (
              <p className="mt-1 text-sm text-red-600">{errors.fieldOfStudy}</p>
            )}
          </div>

          {/* Institution */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Institution *
            </label>
            <input
              type="text"
              name="institution"
              value={formData.institution}
              onChange={handleInputChange}
              placeholder="e.g., University of California, Berkeley"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.institution ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.institution && (
              <p className="mt-1 text-sm text-red-600">{errors.institution}</p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                max={todayIso}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.startDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date {!formData.currentlyEnrolled && '*'}
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                max={todayIso}
                disabled={formData.currentlyEnrolled}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  formData.currentlyEnrolled ? 'bg-gray-100 cursor-not-allowed' : ''
                } ${
                  errors.endDate ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* Currently Enrolled */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="currentlyEnrolled"
              id="currentlyEnrolled"
              checked={formData.currentlyEnrolled}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="currentlyEnrolled" className="ml-2 text-sm text-gray-700">
              I am currently enrolled in this program
            </label>
          </div>

          {/* Grade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grade/GPA (Optional)
            </label>
            <input
              type="text"
              name="grade"
              value={formData.grade}
              onChange={handleInputChange}
              placeholder="e.g., 3.8 GPA, First Class, A+"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              placeholder="Describe your coursework, achievements, or relevant activities..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors resize-none"
            />
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {submitError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center"
              >
                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                <span className="text-sm text-red-700">{submitError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading || submitSuccess}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || submitSuccess}
              className="w-full sm:flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Adding...' : submitSuccess ? 'Added!' : 'Add Education'}
            </button>
          </div>

            {/* Progress Info */}
            <div className="text-center pt-2">
              <p className="text-xs text-gray-500">
                Adding education will increase your profile completion by 20%
              </p>
            </div>
          </form>
        </div>
        
        {/* Loading Overlay */}
        {(loading || submitSuccess) && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <div className="text-center">
              {submitSuccess ? (
                <div className="text-blue-600">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3" />
                  <p className="text-lg font-medium">Education Added!</p>
                  <p className="text-sm text-gray-600">Updating your profile...</p>
                </div>
              ) : (
                <div>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-sm font-medium text-gray-700">Adding education...</p>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
      </div>
    </div>
  );
};

export default EducationForm;