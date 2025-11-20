import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { motion } from 'framer-motion';

const LogoMark = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="3" y="5" width="26" height="22" rx="6" stroke="currentColor" strokeWidth="1.5" />
    <path d="M9 11H16.5C19.5376 11 22 13.4624 22 16.5C22 19.5376 19.5376 22 16.5 22H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 16H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function CompleteProfile() {
  const navigate = useNavigate();
  const { isLoaded, user } = useUser();
  
  const [step, setStep] = useState(1); // 1: role selection, 2: additional info
  const [role, setRole] = useState('');
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    companyWebsite: '',
    professionalHeadline: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const checkProfileCompletion = useCallback(async (existingRole) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/user-role`, {
        credentials: 'include',
      });

      if (response.ok) {
        const { role } = await response.json();
        if (role) {
          // Profile exists, redirect to dashboard
          const redirectPath = role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard';
          navigate(redirectPath, { replace: true });
          return;
        }
      }
      
      // No profile found, continue with completion
      setRole(existingRole);
      setStep(2);
    } catch (err) {
      console.error('Error checking profile:', err);
      // Continue with profile completion
      setRole(existingRole || '');
      setStep(existingRole ? 2 : 1);
    }
  }, [navigate]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      navigate('/sign-in', { replace: true });
      return;
    }

    // Check if user already has a role in Clerk metadata
    const existingRole = user.publicMetadata?.role;
    if (existingRole) {
      // User already has role, check if profile is complete in database
      checkProfileCompletion(existingRole);
    } else {
      // Check if role was saved in sessionStorage from sign-up
      const savedRole = sessionStorage.getItem('pendingRole');
      if (savedRole && ['employer', 'candidate'].includes(savedRole)) {
        setRole(savedRole);
        setStep(2);
        sessionStorage.removeItem('pendingRole');
      }
    }
  }, [isLoaded, user, navigate, checkProfileCompletion]);

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setStep(2);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (role === 'employer') {
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Company name is required';
      }
      if (!formData.industry.trim()) {
        newErrors.industry = 'Industry is required';
      }
    }
    // Professional headline is optional for candidates

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!isLoaded || !user) return;

    setLoading(true);
    setErrors({});

    try {
      // Get user's email from Clerk
      const email = user.emailAddresses[0]?.emailAddress;
      const fullName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || email;

      // Call backend to create/update user profile
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/complete-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          clerkUserId: user.id,
          role,
          email,
          fullName,
          ...(role === 'employer' && {
            companyName: formData.companyName,
            industry: formData.industry,
            companyWebsite: formData.companyWebsite,
          }),
          ...(role === 'candidate' && {
            professionalHeadline: formData.professionalHeadline,
          }),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete profile');
      }

      // Reload user to get updated metadata
      await user.reload();

      // Redirect to appropriate dashboard
      const redirectPath = role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard';
      navigate(redirectPath, { replace: true });
    } catch (err) {
      console.error('Complete profile error:', err);
      setErrors({ general: err.message || 'Failed to complete profile. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-xl font-semibold text-slate-900">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900">
              <LogoMark className="h-6 w-6" />
            </span>
            <span>IntelliHire</span>
          </Link>
        </div>

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8"
          >
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Complete Your Profile</h2>
            <p className="text-slate-600 mb-8">Choose your role to get started</p>

            <div className="space-y-4">
              <button
                onClick={() => handleRoleSelect('employer')}
                className="w-full p-6 border-2 border-slate-200 rounded-xl hover:border-slate-900 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-slate-100 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">I'm looking to hire</h3>
                    <p className="text-sm text-slate-600">Post jobs and find the perfect candidates</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleRoleSelect('candidate')}
                className="w-full p-6 border-2 border-slate-200 rounded-xl hover:border-slate-900 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-slate-100 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">I'm looking for a job</h3>
                    <p className="text-sm text-slate-600">Browse jobs and apply to opportunities</p>
                  </div>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Additional Information */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8"
          >
            {!user.publicMetadata?.role && (
              <button
                onClick={() => setStep(1)}
                className="mb-4 text-slate-600 hover:text-slate-900 flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}

            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {role === 'employer' ? 'Company Information' : 'Your Profile'}
            </h2>
            <p className="text-slate-600 mb-6">
              {role === 'employer' 
                ? 'Tell us about your company to complete your profile' 
                : 'Add a professional headline to help employers find you (optional)'}
            </p>

            {errors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {role === 'employer' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                        errors.companyName ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="Acme Inc"
                    />
                    {errors.companyName && <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Industry/Sector <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="industry"
                      value={formData.industry}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                        errors.industry ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="Technology"
                    />
                    {errors.industry && <p className="mt-1 text-sm text-red-600">{errors.industry}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Company Website
                    </label>
                    <input
                      type="url"
                      name="companyWebsite"
                      value={formData.companyWebsite}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                      placeholder="https://example.com"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Professional Headline
                  </label>
                  <input
                    type="text"
                    name="professionalHeadline"
                    value={formData.professionalHeadline}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="e.g., Software Engineer"
                  />
                  <p className="mt-1 text-xs text-slate-500">You can skip this and complete it later from your dashboard</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Completing Profile...' : role === 'candidate' ? 'Continue to Dashboard' : 'Complete Profile'}
              </button>
            </form>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
