import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ApiError } from '@/lib/api';

interface QueryErrorProps {
  error: Error | null;
  onRetry?: () => void;
}

export function QueryError({ error, onRetry }: QueryErrorProps) {
  if (!error) return null;

  const message =
    error instanceof ApiError
      ? error.message
      : 'Something went wrong loading this data.';

  const isNetwork = error instanceof ApiError && (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT');

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardContent className="py-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive">
            {isNetwork ? 'Connection error' : 'Failed to load data'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
