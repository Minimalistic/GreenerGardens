import { useHarvests, useHarvestStats } from '@/hooks/use-harvests';
import { StatCard } from '@/components/garden/stat-card';
import { EmptyState } from '@/components/garden/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Scissors, Scale, Sprout } from 'lucide-react';
const QUALITY_COLORS: Record<string, string> = {
  excellent: 'bg-green-50 text-green-700',
  good: 'bg-blue-50 text-blue-700',
  fair: 'bg-yellow-50 text-yellow-700',
  poor: 'bg-red-50 text-red-700',
};

export function HarvestLog() {
  const { data: harvestsData, isLoading } = useHarvests();
  const { data: statsData } = useHarvestStats();
  const harvests = harvestsData?.data ?? [];
  const stats = statsData?.data;

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={Scissors} label="Total Harvests" value={stats.total_harvests} />
          <StatCard icon={Scale} label="Total Weight" value={`${(stats.total_weight_oz / 16).toFixed(1)} lb`} />
          <StatCard icon={Sprout} label="Plants Harvested" value={stats.unique_plants} />
        </div>
      )}

      {harvests.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title="No Harvests Yet"
          description="Log your first harvest from a plant instance page."
        />
      ) : (
        <div className="space-y-2">
          {harvests.map((h: any) => (
            <Card key={h.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {h.common_name}
                    {h.variety_name && <span className="text-muted-foreground ml-1">'{h.variety_name}'</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {h.quantity} {h.unit} · {h.date_harvested}
                  </p>
                </div>
                <Badge variant="outline" className={QUALITY_COLORS[h.quality] ?? ''}>
                  {h.quality}
                </Badge>
                <Badge variant="outline" className="capitalize text-xs">
                  {h.destination?.replace('_', ' ')}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
