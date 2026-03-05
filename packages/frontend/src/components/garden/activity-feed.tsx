import { useRecentActivity } from '@/hooks/use-history';
import { ActivityFeedItem } from './activity-feed-item';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ActivityFeed() {
  const { data, isLoading } = useRecentActivity(10);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const items = data?.data ?? [];

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No activity yet. Start by creating a plot!
      </p>
    );
  }

  return (
    <ScrollArea className="h-80">
      <div className="space-y-1">
        {items.map((item) => (
          <ActivityFeedItem key={item.id} item={item} />
        ))}
      </div>
    </ScrollArea>
  );
}
