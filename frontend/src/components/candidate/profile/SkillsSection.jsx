// frontend/src/components/candidate/profile/SkillsSection.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const SkillsSection = ({ profile, onUpdate, onUnsavedChanges }) => {
  const [skills, setSkills] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Popular skills suggestions
  const popularSkills = [
    'JavaScript', 'Python', 'React', 'Node.js', 'Java', 'C++', 'SQL', 'MongoDB',
    'AWS', 'Docker', 'Kubernetes', 'Git', 'HTML/CSS', 'TypeScript', 'Angular',
    'Vue.js', 'Express.js', 'Django', 'Flask', 'Spring Boot', 'PostgreSQL',
    'Redis', 'GraphQL', 'REST APIs', 'Microservices', 'Agile', 'Scrum',
    'Project Management', 'Leadership', 'Communication', 'Problem Solving',
    'Team Collaboration', 'Critical Thinking', 'Data Analysis', 'Machine Learning',
    'Artificial Intelligence', 'DevOps', 'CI/CD', 'Testing', 'Debugging'
  ];

  useEffect(() => {
    if (profile?.skills) {
      setSkills([...profile.skills]);
    }
  }, [profile]);

  useEffect(() => {
    onUnsavedChanges(hasChanges);
  }, [hasChanges, onUnsavedChanges]);

  const addSkill = (skillToAdd) => {
    const skill = skillToAdd.trim();
    if (!skill) return;

    if (skills.includes(skill)) {
      toast.error('Skill already added');
      return;
    }

    if (skills.length >= 20) {
      toast.error('Maximum 20 skills allowed');
      return;
    }

    setSkills(prev => [...prev, skill]);
    setInputValue('');
    setHasChanges(true);
  };

  const removeSkill = (skillToRemove) => {
    setSkills(prev => prev.filter(skill => skill !== skillToRemove));
    setHasChanges(true);
  };

  const handleInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill(inputValue);
    } else if (e.key === ',') {
      e.preventDefault();
      addSkill(inputValue);
    }
  };

  const handleSuggestedSkillClick = (skill) => {
    addSkill(skill);
  };

  const handleSave = async () => {
    if (skills.length < 3) {
      toast.error('Please add at least 3 skills');
      return;
    }

    setSaving(true);
    try {
      await onUpdate(skills);
      setHasChanges(false);
      toast.success('Skills updated successfully');
    } catch (error) {
      console.error('Update skills error:', error);
      toast.error('Failed to update skills');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile?.skills) {
      setSkills([...profile.skills]);
    }
    setHasChanges(false);
    setInputValue('');
  };

  const filteredSuggestions = popularSkills.filter(skill => 
    !skills.includes(skill) && 
    skill.toLowerCase().includes(inputValue.toLowerCase())
  ).slice(0, 8);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Skills</h2>
      
      <div className="space-y-6">
        {/* Current Skills */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Your Skills ({skills.length}/20)
          </h3>
          
          {skills.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Skills Added</h4>
              <p className="text-gray-600">Add your skills to help employers find you</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                >
                  {skill}
                  <button
                    onClick={() => removeSkill(skill)}
                    className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-600 hover:bg-blue-200 hover:text-blue-800 transition-colors"
                    title="Remove skill"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Add Skills Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add Skills
          </label>
          <div className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleInputKeyPress}
              placeholder="Type a skill and press Enter or comma to add"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={skills.length >= 20}
            />
            {inputValue && (
              <button
                onClick={() => addSkill(inputValue)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Press Enter or comma to add multiple skills. Minimum 3 skills required.
          </p>
        </div>

        {/* Skill Suggestions */}
        {(inputValue || skills.length === 0) && filteredSuggestions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {inputValue ? 'Matching Skills' : 'Popular Skills'}
            </h4>
            <div className="flex flex-wrap gap-2">
              {filteredSuggestions.map((skill) => (
                <button
                  key={skill}
                  onClick={() => handleSuggestedSkillClick(skill)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-full hover:bg-gray-50 hover:border-gray-400 transition-colors"
                >
                  + {skill}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Skills Categories for Inspiration */}
        {skills.length === 0 && !inputValue && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Skill Categories</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
              <div>
                <p className="font-medium mb-1">Technical Skills:</p>
                <p>Programming languages, frameworks, databases, tools</p>
              </div>
              <div>
                <p className="font-medium mb-1">Soft Skills:</p>
                <p>Communication, leadership, problem-solving, teamwork</p>
              </div>
              <div>
                <p className="font-medium mb-1">Industry Skills:</p>
                <p>Domain-specific knowledge and certifications</p>
              </div>
              <div>
                <p className="font-medium mb-1">Languages:</p>
                <p>English, Spanish, Mandarin, etc.</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {hasChanges && (
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || skills.length < 3}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {saving && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              Save Skills
            </button>
          </div>
        )}

        {/* Skills Progress */}
        {skills.length > 0 && skills.length < 3 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex">
              <svg className="flex-shrink-0 w-5 h-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  Add {3 - skills.length} more skill{3 - skills.length !== 1 ? 's' : ''} to complete this section
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillsSection;