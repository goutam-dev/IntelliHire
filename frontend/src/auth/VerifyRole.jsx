import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';

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

export function VerifyRole() {
  const navigate = useNavigate();
  const { isLoaded, user } = useUser();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      navigate('/sign-in', { replace: true });
      return;
    }

    const verifyAndRedirect = async () => {
      try {
        // Fetch user role from backend
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/user-role`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Unable to determine user role');
        }

        const { role } = await response.json();

        if (!role) {
          // No role found - redirect to complete profile
          navigate('/complete-profile', { replace: true });
          return;
        }

        // Role exists - redirect to appropriate dashboard
        const redirectPath = role === 'employer' ? '/employer/dashboard' : '/candidate/dashboard';
        navigate(redirectPath, { replace: true });
      } catch (err) {
        console.error('Error fetching user role:', err);
        setError('Failed to verify your account. Please try again.');
        
        // Redirect to complete profile after error
        setTimeout(() => {
          navigate('/complete-profile', { replace: true });
        }, 2000);
      }
    };

    verifyAndRedirect();
  }, [isLoaded, user, navigate]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-xl font-semibold text-slate-900">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900">
              <LogoMark className="h-6 w-6" />
            </span>
            <span>IntelliHire</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          {error ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Verification Error</h2>
              <p className="text-slate-600">{error}</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4 animate-pulse">
                <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Verifying Your Account</h2>
              <p className="text-slate-600">Please wait while we prepare your dashboard...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
