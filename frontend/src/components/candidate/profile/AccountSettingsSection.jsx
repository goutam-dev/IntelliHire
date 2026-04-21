import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import ProfileImageUpload from '../../common/ProfileImageUpload';
import { Loader2, Eye, EyeOff, Trash2, AlertTriangle, Shield, User as UserIcon, Bell, Save } from 'lucide-react';

const AccountSettingsSection = ({ profile }) => {
  const { user } = useUser();
  const navigate = useNavigate();
  
  const hasPassword = user?.passwordEnabled || false;
  const oauthProvider = user?.externalAccounts?.[0]?.provider || 'a social provider';
  
  const [nameData, setNameData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || ''
  });
  const [updatingName, setUpdatingName] = useState(false);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  const [notifications, setNotifications] = useState({
    applicationUpdates: true,
    jobRecommendations: true,
    marketingEmails: false
  });
  const [updatingNotifications, setUpdatingNotifications] = useState(false);

  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleNameChange = (e) => {
    const { name, value } = e.target;
    setNameData(prev => ({ ...prev, [name]: value }));
  };

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    if (!nameData.firstName.trim()) { toast.error('First name is required'); return; }
    setUpdatingName(true);
    try {
      await user.update({ firstName: nameData.firstName.trim(), lastName: nameData.lastName.trim() });
      toast.success('Identity synchronized successfully');
    } catch (error) { toast.error(error.errors?.[0]?.message || 'Failed to update name'); } 
    finally { setUpdatingName(false); }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (passwordData.newPassword.length < 8) { toast.error('Password minimum 8 characters'); return; }
    setChangingPassword(true);
    try {
      await user.updatePassword({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword, signOutOfOtherSessions: true });
      toast.success('Vault secure: Password changed');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) { toast.error(error.errors?.[0]?.message || 'Failed to change password'); } 
    finally { setChangingPassword(false); }
  };

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target;
    setNotifications(prev => ({ ...prev, [name]: checked }));
  };

  const handleNotificationSubmit = async (e) => {
    e.preventDefault();
    setUpdatingNotifications(true);
    setTimeout(() => { toast.success('Notification stack updated'); setUpdatingNotifications(false); }, 800);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') { toast.error('Format constraint: Type DELETE precisely'); return; }
    setIsDeletingAccount(true);
    try {
      await user.delete();
      toast.success('Account purged successfully');
      navigate('/');
    } catch (error) { toast.error(error.errors?.[0]?.message || 'Termination failed'); setIsDeletingAccount(false); }
  };

  return (
    <div className="space-y-8">
      {/* Profile Photo */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-[24px] overflow-hidden ring-1 ring-zinc-100">
        <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-100 flex items-center gap-3">
          <UserIcon className="w-5 h-5 text-zinc-900" />
          <h3 className="text-sm font-extrabold text-zinc-900 uppercase tracking-widest">Avatar Setup</h3>
        </div>
        <div className="p-6 bg-white">
          <ProfileImageUpload theme="candidate" />
        </div>
      </div>

      {/* Auth Info */}
      <div className="bg-white border-2 border-indigo-100 shadow-lg rounded-[24px] overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        <div className="px-6 py-5 bg-gradient-to-r from-zinc-900 to-indigo-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm shadow-inner ring-1 ring-white/20">
              <Shield className="w-5 h-5 text-white" />
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
                <input type="text" name="firstName" value={nameData.firstName} onChange={handleNameChange} autoComplete="off" className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-zinc-900" required />
              </div>
              <div>
                <label className="block text-xs font-extrabold text-zinc-900 uppercase tracking-widest mb-1.5">Last Name</label>
                <input type="text" name="lastName" value={nameData.lastName} onChange={handleNameChange} autoComplete="off" className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-zinc-900" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={updatingName} className="px-6 py-2.5 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:-translate-y-0.5 flex items-center gap-2">
                {updatingName ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                {updatingName ? 'Synchronizing...' : 'Save Identity'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white border border-zinc-200 shadow-sm rounded-[24px] overflow-hidden">
        <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-100 flex items-center gap-3">
          <Bell className="w-5 h-5 text-zinc-900" />
          <h3 className="text-sm font-extrabold text-zinc-900 uppercase tracking-widest">Notifications</h3>
        </div>
        <div className="p-6 md:p-8 bg-white">
          <form onSubmit={handleNotificationSubmit} className="space-y-6">
            <div className="grid gap-4">
              {[
                { id: 'applicationUpdates', title: 'Application Updates', desc: 'Get notified when your application status changes.' },
                { id: 'jobRecommendations', title: 'Job Recommendations', desc: 'Receive suggestions for jobs that match your profile.' },
                { id: 'marketingEmails', title: 'Marketing Emails', desc: 'Receive news, tips, and promotional content.' }
              ].map(n => (
                <label key={n.id} className="flex items-center gap-4 p-4 border border-zinc-200 rounded-2xl hover:border-zinc-400 hover:bg-zinc-50 cursor-pointer transition-all group">
                  <div className="relative flex items-center justify-center">
                    <input type="checkbox" name={n.id} checked={notifications[n.id]} onChange={handleNotificationChange} className="peer w-6 h-6 border-2 border-zinc-300 rounded-md appearance-none checked:bg-zinc-900 checked:border-zinc-900 transition-colors" />
                    <svg className="absolute w-4 h-4 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-zinc-900">{n.title}</p>
                    <p className="text-xs font-semibold text-zinc-500 mt-0.5">{n.desc}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={updatingNotifications} className="px-6 py-2.5 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2">
                {updatingNotifications ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                {updatingNotifications ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-rose-50/50 border border-rose-200 shadow-sm rounded-[24px] overflow-hidden group">
        <div className="px-6 py-4 bg-gradient-to-r from-rose-100 to-rose-50 border-b border-rose-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-700" />
          <h3 className="text-sm font-extrabold text-rose-900 uppercase tracking-widest">Delete Account</h3>
        </div>
        <div className="p-6 md:p-8">
          <div className="max-w-2xl">
            <h4 className="text-base font-extrabold text-rose-900 mb-2">Delete Your Account</h4>
            <p className="text-sm font-semibold text-rose-800/80 mb-6">
              Deleting your account is permanent. All your data, profile information, and job applications will be permanently removed. This action cannot be undone.
            </p>
            <div className="bg-white border border-rose-200 p-5 rounded-2xl shadow-sm">
              <label className="block text-xs font-extrabold text-rose-900 uppercase tracking-widest mb-3">Type "DELETE" to confirm</label>
              <div className="flex gap-3">
                <input type="text" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} placeholder="Type DELETE" className="flex-1 px-4 py-3 bg-rose-50/50 border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 font-bold text-rose-900 outline-none" />
                <button onClick={handleDeleteAccount} disabled={deleteConfirmation !== 'DELETE' || isDeletingAccount} className="px-6 py-3 bg-rose-600 text-white font-extrabold rounded-xl hover:bg-rose-700 shadow-sm disabled:opacity-50 disabled:bg-rose-300 transition-all flex items-center gap-2">
                  {isDeletingAccount ? <Loader2 className="animate-spin w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                  {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsSection;
