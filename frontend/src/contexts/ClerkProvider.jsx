import { ClerkProvider as BaseClerkProvider, useUser } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setUser, clearUser, setLoaded } from '../store/slices/authSlice';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key');
}

// Component to sync Clerk state with Redux
function ClerkToReduxSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const dispatch = useDispatch();

  useEffect(() => {
    if (isLoaded) {
      if (isSignedIn && user) {
        // Get role from Clerk's public metadata
        const role = user.publicMetadata?.role || null;
        dispatch(setUser({ user, role }));
      } else {
        dispatch(clearUser());
      }
      dispatch(setLoaded(true));
    }
  }, [isLoaded, isSignedIn, user, dispatch]);

  return null;
}

export function ClerkProvider({ children }) {
  return (
    <BaseClerkProvider 
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
    >
      <ClerkToReduxSync />
      {children}
    </BaseClerkProvider>
  );
}
