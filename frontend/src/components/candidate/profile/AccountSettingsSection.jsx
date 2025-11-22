// frontend/src/components/candidate/profile/AccountSettingsSection.jsx
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../../lib/api';

const AccountSettingsSection = ({ profile }) => {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [notifications, setNotifications] = useState({
    applicationUpdates: true,
    jobRecommendations: true,
    marketingEmails: false
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [updatingNotifications, setUpdatingNotifications] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotifications(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setChangingPassword(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Password change error:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleNotificationSubmit = async (e) => {
    e.preventDefault();
    
    setUpdatingNotifications(true);
    try {
      await api.put('/candidate/profile/notifications', notifications);
      toast.success('Notification preferences updated successfully');
    } catch (error) {
      console.error('Notification update error:', error);
      toast.error('Failed to update notification preferences');
    } finally {
      setUpdatingNotifications(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Please type "DELETE" to confirm account deletion');
      return;
    }

    try {
      await api.delete('/auth/delete-account');
      toast.success('Account deleted successfully');
      
      // Clear local storage and redirect
      localStorage.removeItem('token');
      window.location.href = '/';
    } catch (error) {
      console.error('Account deletion error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete account');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Settings</h2>
      
      <div className="space-y-8">
        {/* Change Password Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={changingPassword}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {changingPassword && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                Change Password
              </button>
            </div>
          </form>
        </div>

        {/* Email Notification Preferences */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notification Preferences</h3>
          
          <form onSubmit={handleNotificationSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="applicationUpdates"
                  checked={notifications.applicationUpdates}
                  onChange={handleNotificationChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="ml-3">
                  <label className="text-sm font-medium text-gray-700">
                    Application Status Updates
                  </label>
                  <p className="text-xs text-gray-500">
                    Get notified when employers update your application status
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="jobRecommendations"
                  checked={notifications.jobRecommendations}
                  onChange={handleNotificationChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="ml-3">
                  <label className="text-sm font-medium text-gray-700">
                    Job Recommendations
                  </label>
                  <p className="text-xs text-gray-500">
                    Receive personalized job recommendations based on your profile
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="marketingEmails"
                  checked={notifications.marketingEmails}
                  onChange={handleNotificationChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="ml-3">
                  <label className="text-sm font-medium text-gray-700">
                    Marketing Emails
                  </label>
                  <p className="text-xs text-gray-500">
                    Receive tips, career advice, and platform updates
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={updatingNotifications}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {updatingNotifications && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                Save Preferences
              </button>
            </div>
          </form>
        </div>

        {/* Account Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Email Address</p>
                <p className="text-sm text-gray-500">{profile?.user?.email}</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Verified
              </span>
            </div>

            <div className="flex justify-between items-center py-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Account Type</p>
                <p className="text-sm text-gray-500">Job Seeker</p>
              </div>
            </div>

            <div className="flex justify-between items-center py-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Member Since</p>
                <p className="text-sm text-gray-500">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Account Section */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-900 mb-4">Delete Account</h3>
          
          <div className="space-y-4">
            <div className="bg-red-100 border border-red-200 rounded p-3">
              <div className="flex">
                <svg className="flex-shrink-0 w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-red-800">Warning</h4>
                  <div className="mt-1 text-sm text-red-700">
                    <p>Deleting your account will:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Permanently delete your profile and all data</li>
                      <li>Remove all your job applications</li>
                      <li>Cancel any ongoing application processes</li>
                      <li>This action cannot be undone</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Delete My Account
              </button>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-red-700 mb-1">
                    Type "DELETE" to confirm account deletion
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-red-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Type DELETE here"
                  />
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'DELETE'}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Permanently Delete Account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsSection;