import { useState, useEffect } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
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

export function SignIn() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = location.state?.from?.pathname || null;
  const [successMessage, setSuccessMessage] = useState(location.state?.message || null);

  useEffect(() => {
    // Check if redirected from password reset
    const passwordResetSuccess = sessionStorage.getItem('passwordResetSuccess');
    console.log('[SignIn] Checking passwordResetSuccess:', passwordResetSuccess);
    if (passwordResetSuccess === 'true') {
      console.log('[SignIn] Setting success message');
      setSuccessMessage('Password reset successful! Please sign in with your new password.');
      sessionStorage.removeItem('passwordResetSuccess');
    }
  }, []);

  const handleGoogleSignIn = async () => {
    if (!isLoaded || !signIn) return;

    setLoading(true);
    setErrors({});

    try {
      // Start Google OAuth flow
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/sign-in/verify-role',
      });
    } catch (err) {
      console.error('Google sign-in error:', err);
      
      if (err.errors && err.errors.length > 0) {
        setErrors({ general: err.errors[0].message });
      } else {
        setErrors({ general: 'Failed to sign in with Google. Please try again.' });
      }
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!isLoaded) return;

    setLoading(true);
    setErrors({});

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });

        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/user-role`, {
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error('Unable to determine user role');
          }

          const { role } = await response.json();

          // Redirect based on role or original location
          if (from) {
            navigate(from, { replace: true });
          } else {
            const redirectPath = role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard';
            navigate(redirectPath, { replace: true });
          }
        } catch (roleErr) {
          console.error('Error fetching user role:', roleErr);
          setErrors({ general: 'Signed in but could not determine your workspace. Please try again.' });
        }
      } else {
        // Handle other statuses if needed
        console.log('Sign in not complete:', result.status);
      }
    } catch (err) {
      console.error('Sign in error:', err);
      
      if (err.errors && err.errors.length > 0) {
        const errorMessage = err.errors[0].message;
        if (errorMessage.toLowerCase().includes('password')) {
          setErrors({ password: 'Invalid email or password' });
        } else if (errorMessage.toLowerCase().includes('identifier')) {
          setErrors({ email: 'Invalid email or password' });
        } else {
          setErrors({ general: errorMessage });
        }
      } else {
        setErrors({ general: 'An error occurred during sign in' });
      }
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
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Professional Minimalist Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-500 opacity-[0.06] blur-[100px]"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-zinc-900 group">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-xl shadow-zinc-900/20 group-hover:scale-105 transition-transform duration-300">
              <LogoMark className="h-7 w-7" />
            </span>
            <span className="tracking-tight">IntelliHire</span>
          </Link>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-[24px] shadow-2xl shadow-zinc-200/50 border border-zinc-100 p-8 sm:p-10">
          <h2 className="text-2xl font-extrabold text-zinc-900 mb-2 tracking-tight">Welcome Back</h2>
          <p className="text-zinc-500 text-sm font-medium mb-6">Sign in to your account to continue</p>

          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-sm font-medium flex items-center gap-3 shadow-sm">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {successMessage}
            </div>
          )}

          {errors.general && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-sm font-medium flex items-center gap-3 shadow-sm">
              <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-extrabold text-zinc-900 uppercase tracking-widest mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
                className={`w-full px-4 py-3 bg-zinc-50 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-zinc-900 outline-none ${
                  errors.email ? 'border-rose-300 ring-4 ring-rose-50' : 'border-zinc-200'
                }`}
                placeholder="john@example.com"
              />
              {errors.email && <p className="mt-2 text-xs font-semibold text-rose-600">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-extrabold text-zinc-900 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  className={`w-full px-4 py-3 bg-zinc-50 pr-10 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-zinc-900 outline-none ${
                    errors.password ? 'border-rose-300 ring-4 ring-rose-50' : 'border-zinc-200'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900 transition-colors"
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
              {errors.password && <p className="mt-2 text-xs font-semibold text-rose-600">{errors.password}</p>}
              <div className="mt-3 text-right">
                <Link to="/forgot-password" className="text-[13px] font-bold text-zinc-900 hover:text-zinc-1100 hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 text-white py-3.5 rounded-xl font-bold hover:bg-zinc-800 focus:ring-4 focus:ring-zinc-900/20 transition-all shadow-xl shadow-zinc-900/20 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
              {loading ? 'Authenticating...' : 'Sign In to Account'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200"></div>
            </div>
            <div className="relative flex justify-center text-[11px] font-extrabold uppercase tracking-widest">
              <span className="px-4 bg-white text-zinc-400">OR</span>
            </div>
          </div>

          {/* Google Sign-in Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-zinc-200 rounded-xl bg-white hover:bg-zinc-50 hover:border-zinc-300 font-bold text-zinc-700 transition-all shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 drop-shadow-sm" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Continuing...' : 'Continue with Google'}
          </button>

          <div className="mt-8 text-center text-sm font-medium text-zinc-500">
            Don't have an account?{' '}
            <Link to="/sign-up" className="font-bold text-zinc-900 hover:text-indigo-600 transition-colors">
              Create an account
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
