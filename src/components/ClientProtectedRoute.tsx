import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { AppLoader } from '@/components/AppLoader';

const LOADING_TIMEOUT_MS = 5000;

export function ClientProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useClientAuth();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setLoadingTimedOut(true), LOADING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (isLoading && !loadingTimedOut) {
    return <AppLoader />;
  }

  if (!isAuthenticated || loadingTimedOut) {
    return <Navigate to="/login" replace state={{ from: window.location.pathname }} />;
  }

  return <>{children}</>;
}
