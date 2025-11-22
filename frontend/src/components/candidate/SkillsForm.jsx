import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { updateSkills } from '../../store/slices/candidateSlice';
import { fetchProfileCompletion } from '../../store/slices/profileCompletionSlice';

const SkillsForm = ({ onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const { profile, loading } = useSelector((state) => state.candidate);
  
  const [skills, setSkills] = useState(profile?.skills || []);
  const [newSkill, setNewSkill] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Popular skills suggestions
  const skillSuggestions = [
    'JavaScript', 'Python', 'React', 'Node.js', 'HTML/CSS', 'Java', 'C++', 'SQL',
    'MongoDB', 'PostgreSQL', 'Git', 'Docker', 'AWS', 'Azure', 'TypeScript',
    'Vue.js', 'Angular', 'Express.js', 'Django', 'Flask', 'Spring Boot',
    'Machine Learning', 'Data Analysis', 'Project Management', 'Agile/Scrum',
    'Communication', 'Leadership', 'Problem Solving', 'Team Collaboration',
    'Digital Marketing', 'SEO', 'Content Writing', 'Graphic Design', 'UI/UX Design',
    'Photoshop', 'Figma', 'Adobe Creative Suite', 'Microsoft Office', 'Excel'
  ];

  const validateForm = () => {
    const newErrors = {};
    
    if (skills.length < 3) {
      newErrors.skills = 'Please add at least 3 skills to complete this section';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addSkill = () => {
    const trimmedSkill = newSkill.trim();
    
    if (!trimmedSkill) {
      return;
    }
    
    if (skills.some(skill => skill.toLowerCase() === trimmedSkill.toLowerCase())) {
      setNewSkill('');
      return; // Skill already exists
    }
    
    setSkills(prev => [...prev, trimmedSkill]);
    setNewSkill('');
    
    // Clear errors if we now have enough skills
    if (skills.length + 1 >= 3 && errors.skills) {
      setErrors(prev => ({ ...prev, skills: '' }));
    }
  };

  const removeSkill = (indexToRemove) => {
    setSkills(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const addSuggestedSkill = (skill) => {
    if (!skills.some(existingSkill => existingSkill.toLowerCase() === skill.toLowerCase())) {
      setSkills(prev => [...prev, skill]);
      
      // Clear errors if we now have enough skills
      if (skills.length + 1 >= 3 && errors.skills) {
        setErrors(prev => ({ ...prev, skills: '' }));
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitError(null);
      
      console.log('Updating skills:', skills); // Debug log
      await dispatch(updateSkills(skills)).unwrap();
      
      // Refresh profile completion
      await dispatch(fetchProfileCompletion());
      
      setSubmitSuccess(true);
      
      setTimeout(() => {
        onSuccess && onSuccess();
        onClose && onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Skills update error:', error); // Debug log
      setSubmitError(error.message || 'Failed to update skills');
    }
  };

  // Filter suggestions to exclude already added skills
  const availableSuggestions = skillSuggestions.filter(
    suggestion => !skills.some(skill => skill.toLowerCase() === suggestion.toLowerCase())
  );

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
              <div className="bg-green-100 p-2 rounded-lg mr-3">
                <Award className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Add Skills</h2>
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
                <p className="text-green-800 font-medium">Skills updated successfully!</p>
                <p className="text-green-700 text-sm">Your profile completion has been updated.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Add New Skill */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Skills (Minimum 3 required)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a skill and press Enter"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Add skills that are relevant to your career goals
            </p>
          </div>

          {/* Current Skills */}
          {skills.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Your Skills ({skills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                <AnimatePresence>
                  {skills.map((skill, index) => (
                    <motion.div
                      key={skill}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center bg-green-100 text-green-800 px-3 py-2 rounded-full text-sm"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => removeSkill(index)}
                        className="ml-2 text-green-600 hover:text-green-800 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Skill Suggestions */}
          {availableSuggestions.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Popular Skills (Click to add)
              </h3>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {availableSuggestions.slice(0, 20).map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => addSuggestedSkill(skill)}
                    className="bg-gray-100 text-gray-700 px-3 py-2 rounded-full text-sm hover:bg-gray-200 transition-colors"
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Skills Progress
              </span>
              <span className="text-sm text-gray-600">
                {skills.length}/3 minimum
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  skills.length >= 3 ? 'bg-green-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${Math.min((skills.length / 3) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {skills.length >= 3 
                ? '✓ Great! You have enough skills to complete this section'
                : `Add ${3 - skills.length} more skill${3 - skills.length !== 1 ? 's' : ''} to complete this section`
              }
            </p>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {(errors.skills || submitError) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center"
              >
                <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                <span className="text-sm text-red-700">
                  {errors.skills || submitError}
                </span>
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
              disabled={loading || submitSuccess || skills.length < 3}
              className="w-full sm:flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Updating...' : submitSuccess ? 'Updated!' : 'Update Skills'}
            </button>
          </div>

            {/* Progress Info */}
            <div className="text-center pt-2">
              <p className="text-xs text-gray-500">
                Adding skills (minimum 3) will increase your profile completion by 20%
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
                  <p className="text-lg font-medium">Skills Updated!</p>
                  <p className="text-sm text-gray-600">Updating your profile...</p>
                </div>
              ) : (
                <div>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-3"></div>
                  <p className="text-sm font-medium text-gray-700">Updating skills...</p>
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

export default SkillsForm;