import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHarvests, useHarvestStats } from '@/hooks/use-harvests';
import { StatCard } from '@/components/garden/stat-card';
import { EmptyState } from '@/components/garden/empty-state';
import { DataTable, type Column } from '@/components/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Scissors, Scale, Sprout, LayoutGrid, TableIcon } from 'lucide-react';
import { QueryError } from '@/components/query-error';

const QUALITY_COLORS: Record<string, string> = {
  excellent: 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200',
  good: 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  fair: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
  poor: 'bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-200',
};

const harvestColumns: Column<any>[] = [
  { key: 'common_name', label: 'Plant', render: (row) => (
    <span>{row.common_name}{row.variety_name && <span className="text-muted-foreground ml-1">'{row.variety_name}'</span>}</span>
  )},
  { key: 'quantity', label: 'Quantity', render: (row) => `${row.quantity} ${row.unit}` },
  { key: 'date_harvested', label: 'Date' },
  { key: 'quality', label: 'Quality', render: (row) => (
    <Badge variant="outline" className={QUALITY_COLORS[row.quality] ?? ''}>{row.quality}</Badge>
  )},
  { key: 'destination', label: 'Destination', render: (row) => (
    <span className="capitalize">{row.destination?.replace('_', ' ') ?? '-'}</span>
  )},
];

export function HarvestLog() {
  const [view, setView] = useState<'card' | 'table'>(() =>
    (localStorage.getItem('harvest-view') as 'card' | 'table') ?? 'card'
  );
  const navigate = useNavigate();
  const harvestsQuery = useHarvests();
  const { data: harvestsData, isLoading } = harvestsQuery;
  const { data: statsData } = useHarvestStats();
  const harvests = harvestsData?.data ?? [];
  const stats = statsData?.data;

  const toggleView = (v: 'card' | 'table') => {
    setView(v);
    localStorage.setItem('harvest-view', v);
  };

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
      {harvestsQuery.isError && (
        <QueryError error={harvestsQuery.error} onRetry={() => harvestsQuery.refetch()} />
      )}
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
        <>
          <div className="flex justify-end gap-1">
            <Button variant={view === 'card' ? 'default' : 'outline'} size="sm" onClick={() => toggleView('card')}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button variant={view === 'table' ? 'default' : 'outline'} size="sm" onClick={() => toggleView('table')}>
              <TableIcon className="w-4 h-4" />
            </Button>
          </div>

          {view === 'table' ? (
            <DataTable data={harvests} columns={harvestColumns} exportFilename="harvests" />
          ) : (
            <div className="space-y-2">
              {harvests.map((h: any) => (
                <Card
                  key={h.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => h.plant_instance_id && navigate(`/plants/${h.plant_instance_id}`)}
                >
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
        </>
      )}
    </div>
  );
}
