import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { AppLoader } from '@/components/AppLoader';

const LOADING_TIMEOUT_MS = 5000;

export function ClientProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useClientAuth();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    console.log('[Mobile Debug] ClientProtectedRoute: Auth state:', { isAuthenticated, isLoading });
    if (!isLoading) return;
    const t = setTimeout(() => {
      console.log('[Mobile Debug] ClientProtectedRoute: Loading timeout reached');
      setLoadingTimedOut(true);
    }, LOADING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isLoading, isAuthenticated]);

  if (isLoading && !loadingTimedOut) {
    console.log('[Mobile Debug] ClientProtectedRoute: Showing loader');
    return <AppLoader />;
  }

  if (!isAuthenticated || loadingTimedOut) {
    // Ensure we redirect to a valid route
    const redirectPath = '/login';
    const currentPath = window.location.pathname;
    console.log('[Mobile Debug] ClientProtectedRoute: Not authenticated, redirecting to:', redirectPath, 'from:', currentPath);
    
    // Prevent redirect loops
    if (currentPath === redirectPath) {
      console.warn('[Mobile Debug] ClientProtectedRoute: Already on login page, preventing redirect loop');
      return <>{children}</>;
    }
    
    return <Navigate to={redirectPath} replace state={{ from: currentPath }} />;
  }

  console.log('[Mobile Debug] ClientProtectedRoute: Authenticated, rendering children');
  return <>{children}</>;
}
