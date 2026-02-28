import { Navigate, Outlet } from 'react-router-dom';
import { useSetupStatus } from '@/hooks/use-setup';
import { Skeleton } from '@/components/ui/skeleton';

export function SetupGuard() {
  const { data, isLoading } = useSetupStatus();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!data?.data?.is_setup_complete) {
    return <Navigate to="/setup" replace />;
  }

  return <Outlet />;
}
