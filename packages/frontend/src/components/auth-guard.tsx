import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { LoadingSpinner } from '@/components/loading-spinner';

export function AuthGuard() {
  const { isAuthenticated, isLoading, needsSetup } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (needsSetup) {
    return <Navigate to="/initial-setup" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
