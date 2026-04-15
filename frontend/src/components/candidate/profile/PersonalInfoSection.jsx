// frontend/src/components/candidate/profile/PersonalInfoSection.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

const PersonalInfoSection = ({ profile, onUpdate, onUnsavedChanges }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    location: '',
    professionalTitle: '',
    linkedinUrl: '',
    portfolioUrl: ''
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.user?.fullName || '',
        phoneNumber: profile.user?.phoneNumber || profile.phoneNumber || '',
        location: profile.location || '',
        professionalTitle: profile.professionalTitle || '',
        linkedinUrl: profile.linkedinUrl || '',
        portfolioUrl: profile.portfolioUrl || ''
      });
    }
  }, [profile]);

  useEffect(() => {
    onUnsavedChanges(hasChanges);
  }, [hasChanges, onUnsavedChanges]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setHasChanges(true);
  };

  const validateUrl = (url, type) => {
    if (!url) return true; // Optional field
    
    try {
      new URL(url);
      if (type === 'linkedin' && !url.includes('linkedin.com')) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate URLs
    if (!validateUrl(formData.linkedinUrl, 'linkedin')) {
      toast.error('Please enter a valid LinkedIn URL');
      return;
    }
    
    if (!validateUrl(formData.portfolioUrl)) {
      toast.error('Please enter a valid portfolio URL');
      return;
    }

    setSaving(true);
    try {
      await onUpdate(formData);
      setHasChanges(false);
      toast.success('Personal information updated successfully');
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update personal information');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        fullName: profile.user?.fullName || '',
        phoneNumber: profile.phoneNumber || '',
        location: profile.location || '',
        professionalTitle: profile.professionalTitle || '',
        linkedinUrl: profile.linkedinUrl || '',
        portfolioUrl: profile.portfolioUrl || ''
      });
    }
    setHasChanges(false);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-zinc-900 mb-6">Personal Information</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Read-only fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={profile?.user?.email || 'Loading...'}
              disabled
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-zinc-50 text-zinc-500 cursor-not-allowed"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Verified email address
            </p>
          </div>
        </div>

        {/* Editable fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="+1 (555) 123-4567"
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Current Location *
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="City, State/Country"
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Professional Title
          </label>
          <input
            type="text"
            name="professionalTitle"
            value={formData.professionalTitle}
            onChange={handleChange}
            placeholder="e.g., Software Engineer, Marketing Manager"
            className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
          />
          <p className="text-xs text-zinc-500 mt-1">
            This appears as your headline on your profile
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              LinkedIn Profile (Optional)
            </label>
            <input
              type="url"
              name="linkedinUrl"
              value={formData.linkedinUrl}
              onChange={handleChange}
              placeholder="https://linkedin.com/in/yourprofile"
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">
              Portfolio Website (Optional)
            </label>
            <input
              type="url"
              name="portfolioUrl"
              value={formData.portfolioUrl}
              onChange={handleChange}
              placeholder="https://yourportfolio.com"
              className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
            />
          </div>
        </div>

        {/* Action Buttons */}
        {hasChanges && (
          <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-200">
            <button
              type="button"
              onClick={handleCancel}
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
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default PersonalInfoSection;