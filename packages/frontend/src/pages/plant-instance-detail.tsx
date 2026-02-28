import { useParams, useNavigate } from 'react-router-dom';
import { usePlantInstance, useUpdatePlantStatus, useUpdatePlantHealth } from '@/hooks/use-plant-instances';
import { useEntityHistory } from '@/hooks/use-history';
import { useHarvestsByPlant, useCreateHarvest } from '@/hooks/use-harvests';
import { PlantStatusBadge } from '@/components/garden/plant-status-badge';
import { HarvestQuickLog } from '@/components/garden/harvest-quick-log';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

const STATUS_ORDER = [
  'planned', 'seed_started', 'seedling', 'transplanted', 'vegetative',
  'flowering', 'fruiting', 'harvesting', 'finished', 'failed', 'removed',
];

const HEALTH_OPTIONS = ['excellent', 'good', 'fair', 'poor', 'critical', 'dead'];

export function PlantInstanceDetail() {
  const { instanceId } = useParams<{ instanceId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = usePlantInstance(instanceId ?? null);
  const { data: historyData } = useEntityHistory('plant_instance', instanceId ?? null);
  const updateStatus = useUpdatePlantStatus();
  const updateHealth = useUpdatePlantHealth();
  const { toast } = useToast();
  const [harvestOpen, setHarvestOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const plant = data?.data as any;
  if (!plant) return <p>Plant not found</p>;

  const handleStatusChange = async (status: string) => {
    try {
      await updateStatus.mutateAsync({ id: instanceId!, status });
      toast({ title: `Status updated to ${status.replace('_', ' ')}` });
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleHealthChange = async (health: string) => {
    try {
      await updateHealth.mutateAsync({ id: instanceId!, health });
      toast({ title: `Health updated to ${health}` });
    } catch {
      toast({ title: 'Failed to update health', variant: 'destructive' });
    }
  };

  const history = historyData?.data ?? [];

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">
            {plant.common_name}
            {plant.variety_name && <span className="text-muted-foreground ml-2">'{plant.variety_name}'</span>}
          </h2>
        </div>
        <PlantStatusBadge status={plant.status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={plant.status} onValueChange={handleStatusChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map(s => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Health</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={plant.health} onValueChange={handleHealthChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {HEALTH_OPTIONS.map(h => (
                  <SelectItem key={h} value={h} className="capitalize">{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {plant.planting_method && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Method</span>
              <span className="capitalize">{plant.planting_method.replace('_', ' ')}</span>
            </div>
          )}
          {plant.date_planted && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Planted</span>
              <span>{plant.date_planted}</span>
            </div>
          )}
          {plant.quantity > 1 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity</span>
              <span>{plant.quantity}</span>
            </div>
          )}
          {plant.source && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Source</span>
              <span>{plant.source}</span>
            </div>
          )}
          {plant.notes && (
            <div>
              <span className="text-muted-foreground">Notes:</span>
              <p className="mt-1">{plant.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => setHarvestOpen(true)}>
          Log Harvest
        </Button>
      </div>

      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((h: any) => (
                <div key={h.id} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground w-24 shrink-0">
                    {formatDistanceToNow(new Date(h.timestamp), { addSuffix: true })}
                  </span>
                  <span className="capitalize">{h.action}</span>
                  {h.field_changes && (
                    <span className="text-muted-foreground">
                      ({Object.keys(h.field_changes).join(', ')})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <HarvestQuickLog
        open={harvestOpen}
        onOpenChange={setHarvestOpen}
        plantInstanceId={instanceId!}
        plotId={plant.plot_id}
      />
    </div>
  );
}
