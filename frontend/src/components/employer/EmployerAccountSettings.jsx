// frontend/src/components/employer/EmployerAccountSettings.jsx
import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import ProfileImageUpload from '../common/ProfileImageUpload';
import { Loader2, Eye, EyeOff, Trash2, AlertTriangle, Shield } from 'lucide-react';

const EmployerAccountSettings = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  
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

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setIsDeletingAccount(true);
    try {
      await user.delete();
      toast.success('Account deleted successfully');
      // Redirect to home page after deletion
      navigate('/');
    } catch (error) {
      console.error('Account deletion error:', error);
      toast.error(error.errors?.[0]?.message || 'Failed to delete account');
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Photo Section */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-[24px] overflow-hidden ring-1 ring-zinc-100">
        <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-100 flex items-center gap-3">
          <svg className="w-5 h-5 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <h3 className="text-sm font-extrabold text-zinc-900 uppercase tracking-widest">Avatar Setup</h3>
        </div>
        <div className="p-6 bg-white">
          <ProfileImageUpload theme="employer" />
        </div>
      </div>

      {/* Auth Info */}
      <div className="bg-white border-2 border-indigo-100 shadow-lg rounded-[24px] overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        <div className="px-6 py-5 bg-gradient-to-r from-zinc-900 to-indigo-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm shadow-inner ring-1 ring-white/20">
               {/* User Info Icon */}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-widest">Account Details</h3>
              <p className="text-indigo-200 text-xs font-medium mt-0.5">Manage your personal information</p>
            </div>
          </div>
        </div>
        <div className="p-6 md:p-8 space-y-8 bg-white relative z-10">
          <form onSubmit={handleNameSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-extrabold text-zinc-900 uppercase tracking-widest mb-1.5">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={nameData.firstName}
                  onChange={handleNameChange}
                  autoComplete="off"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-zinc-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-zinc-900 uppercase tracking-widest mb-1.5">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={nameData.lastName}
                  onChange={handleNameChange}
                  autoComplete="off"
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-zinc-900"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updatingName}
                className="px-6 py-2.5 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:-translate-y-0.5 flex items-center gap-2"
              >
                {updatingName && <Loader2 className="animate-spin h-4 w-4" />}
                {updatingName ? 'Synchronizing...' : 'Save Identity'}
              </button>
            </div>
          </form>

          <hr className="border-t border-zinc-100" />

          {/* Change Password Section */}
          {hasPassword ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100/60 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Shield className="w-24 h-24 text-indigo-500" />
                </div>
                <div className="relative z-10">
                  <h4 className="text-[13px] font-extrabold text-indigo-900 uppercase tracking-widest mb-1">Update Password</h4>
                  <p className="text-xs font-semibold text-indigo-600 mb-5">Change your password to keep your account secure.</p>
                  
                  <div className="space-y-5 flex max-w-2xl flex-col">
                    <div>
                      <label className="block text-xs font-extrabold text-indigo-900 uppercase tracking-widest mb-1.5">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.currentPassword ? "text" : "password"}
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors font-medium text-zinc-900 placeholder:text-zinc-300"
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(prev => ({ ...prev, currentPassword: !prev.currentPassword }))}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-600 transition-colors"
                        >
                          {showPasswords.currentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-extrabold text-indigo-900 uppercase tracking-widest mb-1.5">New Password</label>
                        <div className="relative">
                          <input
                            type={showPasswords.newPassword ? "text" : "password"}
                            name="newPassword"
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                            className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors font-medium text-zinc-900 placeholder:text-zinc-300"
                            placeholder="••••••••"
                            required
                            minLength={8}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, newPassword: !prev.newPassword }))}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-600 transition-colors"
                          >
                            {showPasswords.newPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-extrabold text-indigo-900 uppercase tracking-widest mb-1.5">Confirm New Password</label>
                        <div className="relative">
                          <input
                            type={showPasswords.confirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                            className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors font-medium text-zinc-900 placeholder:text-zinc-300"
                            placeholder="••••••••"
                            required
                            minLength={8}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPasswords(prev => ({ ...prev, confirmPassword: !prev.confirmPassword }))}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-600 transition-colors"
                          >
                            {showPasswords.confirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-xs font-semibold text-indigo-500 bg-indigo-100/50 px-3 py-1 rounded-full border border-indigo-200/50">Minimum 8 characters</p>
                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      {changingPassword ? <Loader2 className="animate-spin h-4 w-4" /> : <Shield className="h-4 w-4" />}
                      {changingPassword ? 'Updating Vault...' : 'Set New Password'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-blue-900 text-sm tracking-wide">Federated Login Active</h3>
                <p className="text-sm font-medium text-blue-800/80 mt-1">Authenticated through <span className="font-bold capitalize">{oauthProvider}</span>. Password policies are delegated upstream to your identity provider.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Information */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-[24px] overflow-hidden">
        <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-100">
          <h3 className="text-sm font-extrabold text-zinc-900 uppercase tracking-widest">Metadata</h3>
        </div>
        <div className="p-6 md:p-8 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email Identity</p>
              <p className="text-sm font-bold text-zinc-900 mt-2 truncate">{user?.primaryEmailAddress?.emailAddress}</p>
              <div className="mt-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">Verified Identity</span>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Account Role</p>
              <p className="text-sm font-bold text-zinc-900 mt-2">Employer / Recruiter</p>
              <div className="mt-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase tracking-wider">Active Status</span>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Creation Date</p>
              <p className="text-sm font-bold text-zinc-900 mt-2 truncate">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone - Delete Account */}
      <div className="bg-white border border-rose-100 shadow-sm rounded-[24px] overflow-hidden">
        <div className="p-6 md:p-8 bg-rose-50/30 flex items-start gap-5">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border border-rose-200">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-rose-900 mb-1">Danger Zone</h3>
            <p className="text-sm text-rose-700/80 mb-5 font-medium leading-relaxed max-w-2xl">
              Purging your account destroys your identity, terminates all job postings, and cascades deletion across all candidate applications tied to your organization. Execution is irreversible.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-5 py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all font-bold shadow-md hover:shadow-lg flex items-center tracking-wide"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              TERMINATE ACCOUNT
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-zinc-100 translate-y-0 transform">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-5 ring-8 ring-rose-50">
                <AlertTriangle className="h-8 w-8 text-rose-600" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900">Total Annihilation</h3>
              <p className="mt-3 text-sm font-medium text-zinc-600 leading-relaxed">
                This action initiates a permanent purge sequence. Your records, postings, and history will be vaporized.
              </p>
            </div>

            <div className="mt-8">
              <label className="block text-sm font-extrabold text-zinc-900 mb-2 uppercase tracking-tight">
                Type <span className="text-rose-600">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="DELETE"
              />
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
                disabled={isDeletingAccount}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || deleteConfirmation !== 'DELETE'}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {isDeletingAccount && (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                )}
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerAccountSettings;
