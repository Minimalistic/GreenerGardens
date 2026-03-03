import { useNavigate } from 'react-router-dom';
import { usePlantCatalogActivity } from '@/hooks/use-plant-catalog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PlantStatusBadge } from '@/components/garden/plant-status-badge';
import { EmptyState } from '@/components/garden/empty-state';
import { Leaf, Wheat, ListChecks, Bug, Package, Inbox } from 'lucide-react';

interface PlantActivityTabProps {
  plantId: string;
}

export function PlantActivityTab({ plantId }: PlantActivityTabProps) {
  const { data, isLoading } = usePlantCatalogActivity(plantId);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const activity = data?.data;
  if (!activity) return null;

  const { counts } = activity;
  const hasAny = counts.plantings + counts.harvests + counts.tasks + counts.pest_events + counts.seeds > 0;

  if (!hasAny) {
    return (
      <EmptyState
        icon={Inbox}
        title="No activity yet"
        description="Once this plant is added to a garden, plantings, harvests, tasks, and more will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {counts.plantings > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Leaf className="w-4 h-4" />
              Plantings
              <Badge variant="secondary" className="ml-auto">{counts.plantings}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {activity.plantings.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/plants/${p.id}`)}
                className="w-full flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted text-left"
              >
                <PlantStatusBadge status={p.status} />
                {p.variety_name && <span className="text-muted-foreground">{p.variety_name}</span>}
                <span className="text-muted-foreground">&middot; {p.plot_name}</span>
                {p.date_planted && (
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {new Date(p.date_planted).toLocaleDateString()}
                  </span>
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {counts.harvests > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wheat className="w-4 h-4" />
              Recent Harvests
              <Badge variant="secondary" className="ml-auto">{counts.harvests}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {activity.harvests.map((h) => (
              <button
                key={h.id}
                onClick={() => navigate(`/plants/${h.plant_instance_id}`)}
                className="w-full flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted text-left"
              >
                <span>{new Date(h.date_harvested).toLocaleDateString()}</span>
                <span className="font-medium">{h.quantity} {h.unit}</span>
                <Badge variant="outline" className="capitalize">{h.quality}</Badge>
                {h.variety_name && <span className="text-muted-foreground">{h.variety_name}</span>}
                <span className="ml-auto text-xs text-muted-foreground shrink-0">{h.plot_name}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {counts.tasks > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ListChecks className="w-4 h-4" />
              Related Tasks
              <Badge variant="secondary" className="ml-auto">{counts.tasks}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {activity.tasks.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate('/tasks')}
                className="w-full flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted text-left"
              >
                <span className="truncate">{t.title}</span>
                <Badge variant="outline" className="capitalize shrink-0">{t.status.replace(/_/g, ' ')}</Badge>
                <Badge variant="outline" className="capitalize shrink-0">{t.priority}</Badge>
                {t.due_date && (
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    Due {new Date(t.due_date).toLocaleDateString()}
                  </span>
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {counts.pest_events > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Pest Events
              <Badge variant="secondary" className="ml-auto">{counts.pest_events}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {activity.pest_events.map((pe) => (
              <button
                key={pe.id}
                onClick={() => navigate('/pest-events')}
                className="w-full flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted text-left"
              >
                <span className="font-medium">{pe.pest_name}</span>
                <Badge variant="outline" className="capitalize">{pe.severity}</Badge>
                <Badge variant="outline" className="capitalize">{pe.outcome}</Badge>
                <span className="ml-auto text-xs text-muted-foreground shrink-0">
                  {new Date(pe.detected_date).toLocaleDateString()}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {counts.seeds > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4" />
              Seed Inventory
              <Badge variant="secondary" className="ml-auto">{counts.seeds}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {activity.seeds.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate('/seeds')}
                className="w-full flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted text-left"
              >
                <span className="font-medium">{s.variety_name}</span>
                {s.brand && <span className="text-muted-foreground">{s.brand}</span>}
                <span>{s.quantity_packets} pkt{s.quantity_packets !== 1 ? 's' : ''}</span>
                {s.expiration_date && (
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    Exp {new Date(s.expiration_date).toLocaleDateString()}
                  </span>
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
