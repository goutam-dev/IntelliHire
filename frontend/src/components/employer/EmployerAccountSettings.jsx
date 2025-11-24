// frontend/src/components/employer/EmployerAccountSettings.jsx
import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import ProfileImageUpload from '../common/ProfileImageUpload';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const EmployerAccountSettings = () => {
  const { user } = useUser();
  
  // Check if user has password authentication (not OAuth-only)
  const hasPassword = user?.passwordEnabled || false;
  const oauthProvider = user?.externalAccounts?.[0]?.provider || 'a social provider';
  
  // Name management state
  const [nameData, setNameData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || ''
  });
  const [updatingName, setUpdatingName] = useState(false);

  // Password management state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Password visibility state
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  const handleNameChange = (e) => {
    const { name, value } = e.target;
    setNameData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    
    if (!nameData.firstName.trim()) {
      toast.error('First name is required');
      return;
    }

    setUpdatingName(true);
    try {
      await user.update({
        firstName: nameData.firstName.trim(),
        lastName: nameData.lastName.trim()
      });
      
      toast.success('Name updated successfully');
    } catch (error) {
      console.error('Name update error:', error);
      toast.error(error.errors?.[0]?.message || 'Failed to update name');
    } finally {
      setUpdatingName(false);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setChangingPassword(true);
    try {
      await user.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        signOutOfOtherSessions: true
      });
      
      toast.success('Password changed successfully');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Password change error:', error);
      toast.error(error.errors?.[0]?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Photo Section */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <ProfileImageUpload theme="employer" />
      </div>

      {/* Name Management Section */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Personal Information</h3>
        
        <form onSubmit={handleNameSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={nameData.firstName}
                onChange={handleNameChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={nameData.lastName}
                onChange={handleNameChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={updatingName}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center"
            >
              {updatingName && (
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
              )}
              Update Name
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Section - Only for password-authenticated users */}
      {hasPassword ? (
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Change Password</h3>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.currentPassword ? "text" : "password"}
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, currentPassword: !prev.currentPassword }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {showPasswords.currentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.newPassword ? "text" : "password"}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, newPassword: !prev.newPassword }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {showPasswords.newPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">Minimum 8 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    {showPasswords.confirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={changingPassword}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center"
              >
                {changingPassword && (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                )}
                Change Password
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* OAuth User Notice */
        <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-sm p-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">OAuth Authentication</h3>
              <p className="mt-1 text-sm text-blue-700">
                You signed in with <span className="font-semibold capitalize">{oauthProvider}</span>. Password management is handled by your authentication provider.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Account Information */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Account Information</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-medium text-slate-700">Email Address</p>
              <p className="text-sm text-slate-600 mt-0.5">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Verified
            </span>
          </div>

          <div className="flex justify-between items-center py-3 border-b border-slate-100">
            <div>
              <p className="text-sm font-medium text-slate-700">Account Type</p>
              <p className="text-sm text-slate-600 mt-0.5">Employer</p>
            </div>
          </div>

          <div className="flex justify-between items-center py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Member Since</p>
              <p className="text-sm text-slate-600 mt-0.5">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">Account Security</h4>
            <p className="mt-1 text-sm text-blue-700">
              Your account is secured by Clerk authentication. All password changes will sign you out of other sessions for security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployerAccountSettings;
