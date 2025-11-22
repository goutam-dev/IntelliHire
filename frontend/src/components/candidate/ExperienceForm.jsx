import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Briefcase, Calendar, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { addExperience } from '../../store/slices/candidateSlice';
import { fetchProfileCompletion } from '../../store/slices/profileCompletionSlice';

const ExperienceForm = ({ onClose, onSuccess, editData = null }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.candidate);
  
  const [formData, setFormData] = useState({
    title: editData?.title || '',
    companyName: editData?.companyName || '',
    location: editData?.location || '',
    startDate: editData?.startDate ? new Date(editData.startDate).toISOString().split('T')[0] : '',
    endDate: editData?.endDate ? new Date(editData.endDate).toISOString().split('T')[0] : '',
    currentlyWorking: editData?.currentlyWorking || false,
    description: editData?.description || '',
    experienceType: editData?.experienceType || 'specific', // 'specific' or 'years'
    yearsOfExperience: editData?.yearsOfExperience || ''
  });
  
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required';
    }
    
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    
    if (formData.experienceType === 'specific') {
      if (!formData.startDate) {
        newErrors.startDate = 'Start date is required';
      }
      
      if (!formData.currentlyWorking && !formData.endDate) {
        newErrors.endDate = 'End date is required if not currently working';
      }
      
      if (formData.startDate && formData.endDate && !formData.currentlyWorking) {
        if (new Date(formData.startDate) >= new Date(formData.endDate)) {
          newErrors.endDate = 'End date must be after start date';
        }
      }
    } else if (formData.experienceType === 'years') {
      if (!formData.yearsOfExperience || formData.yearsOfExperience < 0) {
        newErrors.yearsOfExperience = 'Years of experience is required';
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
      
      // Build experience data based on type
      const experienceData = {
        title: formData.title,
        companyName: formData.companyName,
        location: formData.location,
        description: formData.description,
        experienceType: formData.experienceType
      };

      // Add type-specific fields
      if (formData.experienceType === 'specific') {
        experienceData.startDate = formData.startDate;
        experienceData.currentlyWorking = formData.currentlyWorking;
        if (!formData.currentlyWorking && formData.endDate) {
          experienceData.endDate = formData.endDate;
        }
      } else if (formData.experienceType === 'years') {
        experienceData.yearsOfExperience = parseFloat(formData.yearsOfExperience);
      }
      
      await dispatch(addExperience(experienceData)).unwrap();
      
      // Refresh profile completion
      await dispatch(fetchProfileCompletion());
      
      setSubmitSuccess(true);
      
      setTimeout(() => {
        onSuccess && onSuccess();
        onClose && onClose();
      }, 1500);
      
    } catch (error) {
      setSubmitError(error.message || 'Failed to add work experience');
    }
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
              <div className="bg-purple-100 p-2 rounded-lg mr-3">
                <Briefcase className="w-6 h-6 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {editData ? 'Edit Work Experience' : 'Add Work Experience'}
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
                <p className="text-green-800 font-medium">Work experience added successfully!</p>
                <p className="text-green-700 text-sm">Your profile completion has been updated.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Software Engineer, Marketing Manager"
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                errors.title ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              placeholder="e.g., Google, Microsoft, Startup Inc."
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                errors.companyName ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.companyName && (
              <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location (Optional)
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g., San Francisco, CA or Remote"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
            />
          </div>

          {/* Experience Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              How would you like to specify your experience? *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="experienceType"
                  value="specific"
                  checked={formData.experienceType === 'specific'}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">Specific Dates</div>
                  <div className="text-xs text-gray-500">Provide exact start and end dates</div>
                </div>
              </label>
              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="experienceType"
                  value="years"
                  checked={formData.experienceType === 'years'}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">Years of Experience</div>
                  <div className="text-xs text-gray-500">Specify total years in this role</div>
                </div>
              </label>
            </div>
          </div>

          {/* Conditional Experience Details */}
          {formData.experienceType === 'specific' ? (
            <>
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
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                      errors.startDate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date {!formData.currentlyWorking && '*'}
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    disabled={formData.currentlyWorking}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                      formData.currentlyWorking ? 'bg-gray-100 cursor-not-allowed' : ''
                    } ${
                      errors.endDate ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>
                  )}
                </div>
              </div>

              {/* Currently Working */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="currentlyWorking"
                  id="currentlyWorking"
                  checked={formData.currentlyWorking}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="currentlyWorking" className="ml-2 text-sm text-gray-700">
                  I currently work here
                </label>
              </div>
            </>
          ) : (
            <>
              {/* Years of Experience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience *
                </label>
                <select
                  name="yearsOfExperience"
                  value={formData.yearsOfExperience}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors ${
                    errors.yearsOfExperience ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select years of experience</option>
                  <option value="0.5">Less than 1 year</option>
                  <option value="1">1 year</option>
                  <option value="2">2 years</option>
                  <option value="3">3 years</option>
                  <option value="4">4 years</option>
                  <option value="5">5 years</option>
                  <option value="6">6 years</option>
                  <option value="7">7 years</option>
                  <option value="8">8 years</option>
                  <option value="9">9 years</option>
                  <option value="10">10+ years</option>
                </select>
                {errors.yearsOfExperience && (
                  <p className="mt-1 text-sm text-red-600">{errors.yearsOfExperience}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Choose this option if you don't remember exact dates or had multiple roles at the same company
                </p>
              </div>
            </>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={5}
              placeholder="Describe your responsibilities, achievements, and key projects..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Tip: Use bullet points to highlight your key achievements and responsibilities
            </p>
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
              className="w-full sm:flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Adding...' : submitSuccess ? 'Added!' : 'Add Experience'}
            </button>
          </div>

            {/* Progress Info */}
            <div className="text-center pt-2">
              <p className="text-xs text-gray-500">
                Adding work experience will increase your profile completion by 20%
              </p>
            </div>
          </form>
        </div>
        
        {/* Loading Overlay */}
        {(loading || submitSuccess) && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <div className="text-center">
              {submitSuccess ? (
                <div className="text-green-600">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3" />
                  <p className="text-lg font-medium">Experience Added!</p>
                  <p className="text-sm text-gray-600">Updating your profile...</p>
                </div>
              ) : (
                <div>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
                  <p className="text-sm font-medium text-gray-700">Adding experience...</p>
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

export default ExperienceForm;