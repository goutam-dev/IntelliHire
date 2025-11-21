import { useState, useEffect } from 'react';
import { useSignUp, useSignIn } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import 'react-phone-number-input/style.css';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';

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

export function SignUp() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const { signIn } = useSignIn();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: role selection, 2: details, 3: verification
  const [role, setRole] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    industry: '',
    companyWebsite: '',
    professionalHeadline: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    // Don't automatically go to step 2, just enable the buttons
  };

  const handleGoogleSignUp = async () => {
    if (!role) {
      setErrors({ general: 'Please select whether you\'re an employer or candidate first' });
      return;
    }

    if (!isLoaded || !signUp) return;

    setLoading(true);
    setErrors({});

    try {
      // Store role in sessionStorage to retrieve after OAuth redirect
      sessionStorage.setItem('pendingRole', role);

      // Start Google OAuth flow
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/complete-profile',
      });
    } catch (err) {
      console.error('Google sign-up error:', err);
      sessionStorage.removeItem('pendingRole');
      
      if (err.errors && err.errors.length > 0) {
        setErrors({ general: err.errors[0].message });
      } else {
        setErrors({ general: 'Failed to sign up with Google. Please try again.' });
      }
      setLoading(false);
    }
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

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!isValidPhoneNumber(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Invalid phone number format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (role === 'employer') {
      if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
      if (!formData.industry.trim()) newErrors.industry = 'Industry is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!isLoaded) return;

    setLoading(true);

    try {
      // Create sign-up with Clerk
      await signUp.create({
        emailAddress: formData.email,
        password: formData.password,
        firstName: formData.fullName.split(' ')[0],
        lastName: formData.fullName.split(' ').slice(1).join(' ') || '',
        unsafeMetadata: {
          role,
          ...(role === 'employer' && {
            companyName: formData.companyName,
            industry: formData.industry,
            companyWebsite: formData.companyWebsite,
          }),
          ...(role === 'candidate' && {
            professionalHeadline: formData.professionalHeadline,
          }),
        },
      });

      // Prepare for email verification
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
      setStep(3);
    } catch (err) {
      console.error('Sign up error:', err);
      if (err.errors && err.errors.length > 0) {
        const errorMessage = err.errors[0].message;
        if (errorMessage.includes('email')) {
          setErrors({ email: errorMessage });
        } else {
          setErrors({ general: errorMessage });
        }
      } else {
        setErrors({ general: 'An error occurred during sign up' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;

    setLoading(true);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (completeSignUp.status === 'complete') {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/complete-signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clerkUserId: completeSignUp.createdUserId,
              role,
              email: formData.email,
              phoneNumber: formData.phoneNumber,
              fullName: formData.fullName,
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
            throw new Error('Failed to persist profile data');
          }
        } catch (apiErr) {
          console.error('Complete signup error:', apiErr);
          setErrors({ verification: 'Account verified but we could not finalize your profile. Please retry shortly.' });
          return;
        }

        await setActive({ session: completeSignUp.createdSessionId });
        
        // Redirect based on role
        const redirectPath = role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard';
        navigate(redirectPath);
      }
    } catch (err) {
      console.error('Verification error:', err);
      setErrors({ verification: err.errors?.[0]?.message || 'Invalid verification code' });
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
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Create Your Account</h2>
            <p className="text-slate-600 mb-8">Choose your role to get started</p>

            {errors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {errors.general}
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={() => handleRoleSelect('employer')}
                className={`w-full p-6 border-2 rounded-xl hover:border-slate-900 hover:shadow-md transition-all text-left group ${
                  role === 'employer' ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg transition-colors ${
                    role === 'employer' 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-slate-100 group-hover:bg-slate-900 group-hover:text-white'
                  }`}>
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
                className={`w-full p-6 border-2 rounded-xl hover:border-slate-900 hover:shadow-md transition-all text-left group ${
                  role === 'candidate' ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg transition-colors ${
                    role === 'candidate' 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-slate-100 group-hover:bg-slate-900 group-hover:text-white'
                  }`}>
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

            {/* Sign-up Method Buttons - Always visible, enabled when role is selected */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 space-y-4"
            >
              {/* Google Sign-up Button */}
              <button
                onClick={handleGoogleSignUp}
                disabled={!role || loading}
                className={`w-full flex items-center justify-center gap-3 px-4 py-3 border rounded-lg transition-all ${
                  !role 
                    ? 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed' 
                    : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill={!role ? "#CBD5E1" : "#4285F4"} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill={!role ? "#CBD5E1" : "#34A853"} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill={!role ? "#CBD5E1" : "#FBBC05"} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill={!role ? "#CBD5E1" : "#EA4335"} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className={!role ? 'text-slate-400' : 'text-slate-900'}>
                  {loading ? 'Connecting...' : 'Continue with Google'}
                </span>
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">OR</span>
                </div>
              </div>

              {/* Continue with Email Button */}
              <button
                onClick={() => setStep(2)}
                disabled={!role || loading}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${
                  !role 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Continue with Email
              </button>

              {!role && (
                <p className="text-xs text-center text-slate-500 mt-2">
                  Please select a role above to continue
                </p>
              )}
            </motion.div>

            <div className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/sign-in" className="font-medium text-slate-900 hover:underline">
                Sign in
              </Link>
            </div>
          </motion.div>
        )}

        {/* Step 2: Registration Form */}
        {step === 2 && !pendingVerification && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8"
          >
            <button
              onClick={() => setStep(1)}
              className="mb-4 text-slate-600 hover:text-slate-900 flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {role === 'employer' ? 'Employer' : 'Candidate'} Registration
            </h2>
            <p className="text-slate-600 mb-6">Fill in your details to continue</p>

            {errors.general && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {errors.general}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Common Fields */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                    errors.fullName ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="John Doe"
                />
                {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="john@example.com"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <PhoneInput
                  international
                  defaultCountry="US"
                  value={formData.phoneNumber}
                  onChange={(value) => setFormData(prev => ({ ...prev, phoneNumber: value || '' }))}
                  className={`w-full px-4 py-2 border rounded-lg focus-within:ring-2 focus-within:ring-slate-900 focus-within:border-transparent [&_input]:!border-none [&_input]:!outline-none [&_input]:!shadow-none ${
                    errors.phoneNumber ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                {errors.phoneNumber && <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                      errors.password ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                      errors.confirmPassword ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>

              {/* Employer-specific fields */}
              {role === 'employer' && (
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
              )}

              {/* Candidate-specific fields */}
              {role === 'candidate' && (
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
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          </motion.div>
        )}

        {/* Step 3: Email Verification */}
        {step === 3 && pendingVerification && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Verify Your Email</h2>
              <p className="text-slate-600">
                We've sent a verification code to<br />
                <span className="font-medium text-slate-900">{formData.email}</span>
              </p>
            </div>

            {errors.verification && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {errors.verification}
              </div>
            )}

            <form onSubmit={handleVerification} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>

            <div className="mt-4 text-center text-sm text-slate-600">
              Didn't receive the code?{' '}
              <button
                onClick={async () => {
                  if (resendCooldown > 0) return;
                  try {
                    setLoading(true);
                    await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
                    setResendCooldown(15);
                  } catch (resendErr) {
                    console.error('Resend verification error:', resendErr);
                    setErrors((prev) => ({ ...prev, verification: 'Unable to resend the code. Please wait and try again.' }));
                  } finally {
                    setLoading(false);
                  }
                }}
                className="font-medium text-slate-900 hover:underline disabled:opacity-50"
                disabled={loading || resendCooldown > 0}
              >
                {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend'}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
