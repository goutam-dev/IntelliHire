// Complete corrected EmployerProfilePage.jsx with proper tab structure - this will replace the buggy version
import React, { useEffect, useState, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { fetchEmployerProfile, updateEmployerProfile, uploadEmployerLogo, resetUpdateSuccess } from '../../store/slices/employerSlice';
import EmployerHeader from '../../components/layout/EmployerHeader';
import EmployerAccountSettings from '../../components/employer/EmployerAccountSettings';
import { Building2, Globe, Mail, Phone, MapPin, Edit2, Camera, X, Save, CheckCircle, AlertCircle, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const EmployerProfilePage = () => {
    const dispatch = useAppDispatch();
    const { getToken } = useAuth();
    const { signOut } = useClerk();
    const { profile, loading, error, updateSuccess } = useAppSelector((state) => state.employer);

    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('company'); // 'company' or 'account'
    const [formData, setFormData] = useState({
        companyName: '',
        industry: '',
        companyDescription: '',
        companyWebsite: '',
        companySize: '',
        contactEmail: '',
        phoneNumber: '',
        location: '',
        socialLinks: { linkedin: '', twitter: '' }
    });

    useEffect(() => {
        const loadProfile = async () => {
            dispatch(fetchEmployerProfile());
        };
        loadProfile();
    }, [dispatch, getToken]);

    useEffect(() => {
        if (profile) {
            setFormData({
                companyName: profile.companyName || '',
                industry: profile.industry || '',
                companyDescription: profile.companyDescription || '',
                companyWebsite: profile.companyWebsite || '',
                companySize: profile.companySize || '',
                contactEmail: profile.contactEmail || '',
                phoneNumber: profile.phoneNumber || '',
                location: profile.location || '',
                socialLinks: {
                    linkedin: profile.socialLinks?.linkedin || '',
                    twitter: profile.socialLinks?.twitter || ''
                }
            });
        }
    }, [profile]);

    useEffect(() => {
        if (updateSuccess) {
            setIsEditing(false);
            const timer = setTimeout(() => {
                dispatch(resetUpdateSuccess());
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [updateSuccess, dispatch]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('socialLinks.')) {
            const socialKey = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                socialLinks: { ...prev.socialLinks, [socialKey]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        dispatch(updateEmployerProfile(formData));
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            dispatch(uploadEmployerLogo(file));
        }
    };

    const completionPercentage = useMemo(() => {
        if (!profile) return 0;
        
        // Fields from EmployerProfile model
        const fields = [
            'companyName', 'industry', 'companyDescription', 'companyWebsite',
            'companySize', 'contactEmail', 'location', 'logoUrl', 'phoneNumber'
        ];
        
        // Count filled fields
        const filledFields = fields.filter(
            field => !!profile[field]
        );
        
        return Math.round((filledFields.length / fields.length) * 100);
    }, [profile]);

    const getLogoUrl = (url) => {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        // Remove /api from the end of API_BASE_URL if present to get server root
        const serverRoot = API_BASE_URL.replace(/\/api\/?$/, '');
        return `${serverRoot}${url}`;
    };

    const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
    };

    const handleLogout = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            <EmployerHeader 
                userName={profile?.user?.fullName} 
                companyName={profile?.companyName}
                onLogout={handleLogout}
            />

            <main className="flex-grow mx-auto max-w-5xl w-full px-4 py-8 space-y-8">

                {/* Header Section */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Company Profile</h1>
                        <p className="text-slate-500 mt-1">Manage your company's public presence and information.</p>
                    </div>

                    {/* Completion Card */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 min-w-[280px]">
                        <div className="relative h-12 w-12 flex-shrink- 0">
                            <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                                <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                <path className="text-indigo-600" strokeDasharray={`${completionPercentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-indigo-600">
                                {completionPercentage}%
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Profile Completion</p>
                            <p className="text-xs text-slate-500">Complete your profile to attract more candidates.</p>
                        </div>
                    </div>
                </motion.div>

                {/* Tab Navigation */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1 flex gap-1"
                >
                    <button
                        onClick={() => {
                            setActiveTab('company');
                            setIsEditing(false);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                            activeTab === 'company'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                    >
                        <Building2 className="h-4 w-4" />
                        Company Profile
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('account');
                            setIsEditing(false);
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                            activeTab === 'account'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                    >
                        <User className="h-4 w-4" />
                        Account Settings
                    </button>
                </motion.div>

                {/* Notifications */}
                <AnimatePresence>
                    {updateSuccess && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2"
                        >
                            <CheckCircle className="h-5 w-5" />
                            Profile updated successfully!
                        </motion.div>
                    )}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="p-4 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2"
                        >
                            <AlertCircle className="h-5 w-5" />
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Main Content - Account Settings Tab */}
                {activeTab === 'account' ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <EmployerAccountSettings />
                    </motion.div>
                ) : (
                    /* Company Profile Tab */
                    <AnimatePresence mode="wait">
                        {!isEditing ? (
                            // VIEW MODE
                            <motion.div
                                key="view"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                className="space-y-6"
                            >
                                {/* Company Header Card */}
                                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
                                    <div className="h-32 bg-slate-900"></div>
                                    <div className="px-8 pb-8">
                                        <div className="relative flex justify-between items-end -mt-12 mb-6">
                                            <div className="relative group">
                                                <div className="h-24 w-24 rounded-2xl bg-white p-1 shadow-lg">
                                                    <div className="h-full w-full rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100">
                                                        {profile?.logoUrl ? (
                                                            <img src={getLogoUrl(profile.logoUrl)} alt="Logo" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <Building2 className="h-10 w-10 text-slate-300" />
                                                        )}
                                                    </div>
                                                </div>
                                                <label className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-md border border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                                                    <Camera className="h-4 w-4 text-slate-600" />
                                                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                                </label>
                                            </div>
                                            <button
                                                onClick={() => setIsEditing(true)}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-all shadow-sm hover:shadow-md active:scale-95"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                                Edit Profile
                                            </button>
                                        </div>

                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900">{profile?.companyName || 'Company Name'}</h2>
                                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-600">
                                                {profile?.industry && <span className="flex items-center gap-1.5"><Building2 className="h-4 w-4" /> {profile.industry}</span>}
                                                {profile?.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {profile.location}</span>}
                                                {profile?.companyWebsite && (
                                                    <a href={profile.companyWebsite} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-indigo-600 hover:underline">
                                                        <Globe className="h-4 w-4" /> Website
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* About Section */}
                                    <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                                        <h3 className="text-lg font-bold text-slate-900 mb-4">About Company</h3>
                                        {profile?.companyDescription ? (
                                            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap break-words">{profile.companyDescription}</p>
                                        ) : (
                                            <div className="text-slate-400 italic flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                                                <p>No description added yet.</p>
                                                <button onClick={() => setIsEditing(true)} className="text-indigo-600 font-medium mt-2 hover:underline">Add Description</button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Details Sidebar */}
                                    <div className="space-y-6">
                                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                                            <h3 className="text-lg font-bold text-slate-900 mb-4">Company Details</h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Company Size</p>
                                                    <p className="text-slate-700 font-medium mt-1">{profile?.companySize || 'Not specified'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact Email</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Mail className="h-4 w-4 text-slate-400" />
                                                        <p className="text-slate-700 font-medium">{profile?.contactEmail || 'Not specified'}</p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <Phone className="h-4 w-4 text-slate-400" />
                                                        <p className="text-slate-700 font-medium">{profile?.phoneNumber || 'Not specified'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            // EDIT MODE
                            <motion.form
                                key="edit"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                                onSubmit={handleSubmit}
                                className="space-y-6"
                            >
                                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                            <Edit2 className="h-5 w-5 text-indigo-600" />
                                            Edit Company Information
                                        </h2>
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>

                                    <div className="p-8 space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Company Name <span className="text-rose-500">*</span></label>
                                                <input
                                                    type="text"
                                                    name="companyName"
                                                    value={formData.companyName}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Industry / Sector</label>
                                                <input
                                                    type="text"
                                                    name="industry"
                                                    value={formData.industry}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Company Size</label>
                                                <div className="relative">
                                                    <select
                                                        name="companySize"
                                                        value={formData.companySize}
                                                        onChange={handleChange}
                                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none appearance-none bg-white"
                                                    >
                                                        <option value="">Select size</option>
                                                        {COMPANY_SIZES.map(size => (
                                                            <option key={size} value={size}>{size} employees</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Website</label>
                                                <div className="relative">
                                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <input
                                                        type="url"
                                                        name="companyWebsite"
                                                        value={formData.companyWebsite}
                                                        onChange={handleChange}
                                                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                                        placeholder="https://example.com"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold text-slate-700">Description</label>
                                            <textarea
                                                name="companyDescription"
                                                value={formData.companyDescription}
                                                onChange={handleChange}
                                                rows={5}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none resize-y"
                                                placeholder="Tell us about your company..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Contact Email</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <input
                                                        type="email"
                                                        name="contactEmail"
                                                        value={formData.contactEmail}
                                                        onChange={handleChange}
                                                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <input
                                                        type="tel"
                                                        name="phoneNumber"
                                                        value={formData.phoneNumber}
                                                        onChange={handleChange}
                                                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-sm font-semibold text-slate-700">Location</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                    <input
                                                        type="text"
                                                        name="location"
                                                        value={formData.location}
                                                        onChange={handleChange}
                                                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none"
                                                        placeholder="City, Country"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="px-6 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-700 hover:bg-white hover:border-slate-300 transition-all shadow-sm"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="px-6 py-2.5 rounded-xl bg-slate-900 font-medium text-white hover:bg-slate-800 transition-all shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {loading ? 'Saving...' : (
                                                <>
                                                    <Save className="h-4 w-4" />
                                                    Save Changes
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.form>
                        )}
                    </AnimatePresence>
                )}
            </main>
        </div>
    );
};

export default EmployerProfilePage;
