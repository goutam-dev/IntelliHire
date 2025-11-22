// frontend/src/components/candidate/profile/SummarySection.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const SummarySection = ({ profile, onUpdate, onUnsavedChanges }) => {
  const [summary, setSummary] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const maxLength = 500;

  useEffect(() => {
    if (profile?.summary) {
      setSummary(profile.summary);
    }
  }, [profile]);

  useEffect(() => {
    onUnsavedChanges(hasChanges);
  }, [hasChanges, onUnsavedChanges]);

  const handleChange = (e) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setSummary(value);
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({ summary });
      setHasChanges(false);
      toast.success('Professional summary updated successfully');
    } catch (error) {
      console.error('Update summary error:', error);
      toast.error('Failed to update summary');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSummary(profile?.summary || '');
    setHasChanges(false);
  };

  const remainingChars = maxLength - summary.length;
  const isNearLimit = remainingChars <= 50;

  // Sample summaries for inspiration
  const sampleSummaries = [
    "Experienced software engineer with 5+ years developing scalable web applications using React, Node.js, and AWS. Passionate about clean code, user experience, and mentoring junior developers. Led cross-functional teams to deliver projects 20% ahead of schedule.",
    
    "Results-driven marketing professional with expertise in digital campaigns, content strategy, and data analytics. Increased brand engagement by 150% and generated $2M+ in revenue through innovative social media strategies. Skilled in SEO, PPC, and marketing automation.",
    
    "Detail-oriented data scientist with strong background in machine learning, statistical analysis, and Python programming. Built predictive models that improved business efficiency by 30%. Experience with SQL, TensorFlow, and cloud platforms.",
    
    "Creative UX/UI designer with 4+ years crafting intuitive digital experiences for web and mobile applications. Proficient in Figma, Adobe Creative Suite, and user research methodologies. Collaborated with product teams to increase user satisfaction by 40%."
  ];

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Professional Summary</h2>
      
      <div className="space-y-6">
        {/* Summary Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Professional Summary
          </label>
          <div className="relative">
            <textarea
              value={summary}
              onChange={handleChange}
              rows={6}
              placeholder="Write a brief overview of your professional experience, key skills, and career goals. This appears at the top of your profile and helps employers understand your value proposition."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <div className={`absolute bottom-2 right-2 text-xs ${
              isNearLimit ? 'text-red-500' : 'text-gray-400'
            }`}>
              {remainingChars} characters remaining
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Maximum {maxLength} characters. This summary will be visible to employers when they view your profile.
          </p>
        </div>

        {/* Writing Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Writing Tips</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Start with your years of experience and primary role</li>
            <li>• Highlight your key technical skills and expertise</li>
            <li>• Include quantifiable achievements when possible</li>
            <li>• Mention your career goals or what you're looking for</li>
            <li>• Keep it concise and focused on your strongest points</li>
          </ul>
        </div>

        {/* Sample Summaries */}
        {!summary && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Sample Summaries for Inspiration</h3>
            <div className="space-y-3">
              {sampleSummaries.map((sample, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded p-3">
                  <p className="text-sm text-gray-700 mb-2">{sample}</p>
                  <button
                    onClick={() => {
                      setSummary(sample);
                      setHasChanges(true);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Use as template
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              These are examples to inspire your own summary. Customize them with your specific experience and achievements.
            </p>
          </div>
        )}

        {/* Current Summary Preview */}
        {summary && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
            <p className="text-sm text-gray-900 leading-relaxed">{summary}</p>
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
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {saving && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              Save Summary
            </button>
          </div>
        )}

        {/* Character Count Warning */}
        {isNearLimit && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex">
              <svg className="flex-shrink-0 w-5 h-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  You're approaching the character limit. Consider making your summary more concise.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummarySection;