import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { AppLoader } from '@/components/AppLoader';

const LOADING_TIMEOUT_MS = 8000;

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();
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
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
