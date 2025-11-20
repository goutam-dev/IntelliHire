import { useState, useEffect } from 'react';
import { useSignIn, useClerk } from '@clerk/clerk-react';
import { Link, useNavigate } from 'react-router-dom';
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

export function ForgotPassword() {
  const { isLoaded, signIn } = useSignIn();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: email entry, 2: code verification, 3: new password, 4: OAuth-only error
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isOAuthOnly, setIsOAuthOnly] = useState(false);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!isLoaded) return;

    setLoading(true);
    setErrors({});

    try {
      // First, check if the email exists in our system and auth type
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/check-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify email');
      }

      if (!data.exists) {
        // Email doesn't exist in the system
        setErrors({ email: 'No account found with this email address' });
        setLoading(false);
        return;
      }

      // Check if account is OAuth-only (no password)
      if (data.isOAuthOnly || !data.hasPassword) {
        setIsOAuthOnly(true);
        setStep(4); // Show OAuth-only error screen
        setLoading(false);
        return;
      }

      // Email exists and has password, proceed with password reset flow
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });

      setSuccessMessage('Password reset code sent to your email');
      setStep(2);
    } catch (err) {
      console.error('Password reset request error:', err);
      
      if (err.message && err.message.includes('No account found')) {
        setErrors({ email: 'No account found with this email address' });
      } else {
        setErrors({ email: 'Failed to send reset code. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCodeVerification = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!code.trim()) {
      newErrors.code = 'Verification code is required';
    }
    if (!password) {
      newErrors.password = 'New password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!isLoaded) return;

    setLoading(true);
    setErrors({});

    try {
      // Attempt to reset the password with the code
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password,
      });

      if (result.status === 'complete') {
        console.log('[ForgotPassword] Password reset successful, showing success step');
        // Password reset successful
        setStep(3);
        
        // Store success message in sessionStorage before signing out
        sessionStorage.setItem('passwordResetSuccess', 'true');
        
        // Sign out the auto-created session and redirect to sign-in
        setTimeout(async () => {
          console.log('[ForgotPassword] Starting signOut...');
          try {
            await signOut();
            console.log('[ForgotPassword] SignOut successful, navigating to /sign-in');
            // Navigate immediately after signOut
            window.location.href = '/sign-in';
          } catch (err) {
            console.error('[ForgotPassword] Sign out error:', err);
            // Navigate anyway even if signOut fails
            window.location.href = '/sign-in';
          }
        }, 2000);
      }
    } catch (err) {
      console.error('Password reset verification error:', err);
      
      if (err.errors && err.errors.length > 0) {
        const errorMessage = err.errors[0].message;
        if (errorMessage.toLowerCase().includes('code')) {
          setErrors({ code: 'Invalid or expired verification code' });
        } else if (errorMessage.toLowerCase().includes('password')) {
          setErrors({ password: errorMessage });
        } else {
          setErrors({ general: errorMessage });
        }
      } else {
        setErrors({ general: 'Failed to reset password. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded || !email || resendCooldown > 0) return;

    setLoading(true);
    setErrors({});

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });

      setSuccessMessage('Verification code resent to your email');
      setResendCooldown(15);
    } catch (err) {
      console.error('Resend code error:', err);
      setErrors({ general: 'Failed to resend code. Please try again.' });
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

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          {/* Step 1: Email Entry */}
          {step === 1 && (
            <>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Reset Your Password</h2>
              <p className="text-slate-600 mb-6">
                Enter your email address and we'll send you a code to reset your password
              </p>

              {errors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder="john@example.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending Code...' : 'Send Reset Code'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/sign-in" className="text-sm font-medium text-slate-900 hover:underline">
                  Back to Sign In
                </Link>
              </div>
            </>
          )}

          {/* Step 2: Code Verification and New Password */}
          {step === 2 && (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Enter Reset Code</h2>
                <p className="text-slate-600">
                  {successMessage || `We've sent a verification code to`}<br />
                  <span className="font-medium text-slate-900">{email}</span>
                </p>
              </div>

              {errors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {errors.general}
                </div>
              )}

              <form onSubmit={handleCodeVerification} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      if (errors.code) setErrors((prev) => ({ ...prev, code: '' }));
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent text-center text-2xl tracking-widest ${
                      errors.code ? 'border-red-500' : 'border-slate-300'
                    }`}
                    placeholder="000000"
                    maxLength={6}
                  />
                  {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                      }}
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
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                      }}
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Resetting Password...' : 'Reset Password'}
                </button>
              </form>

              <div className="mt-4 text-center text-sm text-slate-600">
                Didn't receive the code?{' '}
                <button
                  onClick={handleResendCode}
                  className="font-medium text-slate-900 hover:underline disabled:opacity-50"
                  disabled={loading || resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend'}
                </button>
              </div>
            </>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Reset Successful!</h2>
              <p className="text-slate-600 mb-6">
                Your password has been reset successfully. Redirecting to sign in...
              </p>
            </div>
          )}

          {/* Step 4: OAuth-Only Account Error */}
          {step === 4 && (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Uses Google Sign-In</h2>
                <p className="text-slate-600 mb-6">
                  Your account (<span className="font-medium text-slate-900">{email}</span>) uses Google sign-in and doesn't have a password. Please sign in with Google to access your account.
                </p>
              </div>

              {/* Google Sign-in Button */}
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    await signIn.authenticateWithRedirect({
                      strategy: 'oauth_google',
                      redirectUrl: '/sso-callback',
                      redirectUrlComplete: '/sign-in/verify-role',
                    });
                  } catch (err) {
                    console.error('Google sign-in error:', err);
                    setErrors({ general: 'Failed to sign in with Google. Please try again.' });
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {loading ? 'Signing In...' : 'Sign in with Google'}
              </button>

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setStep(1);
                    setEmail('');
                    setErrors({});
                    setIsOAuthOnly(false);
                  }}
                  className="text-sm font-medium text-slate-900 hover:underline"
                >
                  Try a different email
                </button>
              </div>

              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs text-slate-600 text-center">
                  <strong>Note:</strong> If you'd like to add password sign-in to your Google account, please sign in with Google first, then you can set up a password from your account settings.
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
