import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { useEffect } from 'react';

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

export function SSOCallback() {
  useEffect(() => {
    // Cleanup any errors from sessionStorage after redirect
    const timer = setTimeout(() => {
      sessionStorage.removeItem('oauth_error');
    }, 100);
    return () => clearTimeout(timer);
  }, []);

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
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4 animate-pulse">
              <svg className="w-8 h-8 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Completing Sign-In</h2>
            <p className="text-slate-600">Please wait while we complete your authentication...</p>
          </div>
        </div>
      </div>

      {/* Handle the OAuth callback */}
      <AuthenticateWithRedirectCallback
        signUpFallbackRedirectUrl="/complete-profile"
        signInFallbackRedirectUrl="/sign-in/verify-role"
        signUpForceRedirectUrl="/complete-profile"
        signInForceRedirectUrl="/sign-in/verify-role"
      />
    </div>
  );
}
