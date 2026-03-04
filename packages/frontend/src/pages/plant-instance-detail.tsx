import { useParams, useNavigate } from 'react-router-dom';
import { usePlantInstance, useUpdatePlantStatus, useUpdatePlantHealth, useUpdatePlantInstance } from '@/hooks/use-plant-instances';
import { useTasks, useUpdateTask } from '@/hooks/use-tasks';
import { useEntityHistory } from '@/hooks/use-history';
import { PlantStatusBadge } from '@/components/garden/plant-status-badge';
import { SeedStartingTracker } from '@/components/garden/seed-starting-tracker';
import { EntityNotes } from '@/components/notes/entity-notes';
import { HarvestQuickLog } from '@/components/garden/harvest-quick-log';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Clock, Pencil, Map, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { CreateTaskDialog } from '@/components/garden/create-task-dialog';
import { PLANT_PLANT_STATUS_ORDER, PLANT_PLANT_HEALTH_OPTIONS } from '@gardenvault/shared';
import type { PlantInstance } from '@gardenvault/shared';

/** Extended plant instance type including joined catalog fields from the API. */
interface PlantInstanceDetail extends PlantInstance {
  common_name: string;
  plant_type?: string;
  plot_name?: string;
}

export function PlantInstanceDetail() {
  const { instanceId } = useParams<{ instanceId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = usePlantInstance(instanceId ?? null);
  const { data: historyData } = useEntityHistory('plant_instance', instanceId ?? null);
  const updateStatus = useUpdatePlantStatus();
  const updateHealth = useUpdatePlantHealth();
  const updatePlantInstance = useUpdatePlantInstance();
  const { data: tasksData } = useTasks();
  const updateTask = useUpdateTask();
  const { toast } = useToast();
  const [harvestOpen, setHarvestOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingHarvestDate, setEditingHarvestDate] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const plant = data?.data as PlantInstanceDetail | undefined;
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

  const allTasks = tasksData?.data ?? [];
  const harvestTask = allTasks.find(
    t => t.task_type === 'harvesting' && t.entity_type === 'plant_instance' && t.entity_id === instanceId && t.status !== 'completed' && t.status !== 'skipped'
  );

  const handleHarvestDateChange = async (newDate: string) => {
    try {
      await updatePlantInstance.mutateAsync({ id: instanceId!, data: { expected_harvest_date: newDate } });
      // Sync the harvest task due_date if one exists
      if (harvestTask) {
        await updateTask.mutateAsync({ id: harvestTask.id, data: { due_date: newDate } });
      }
      toast({ title: 'Expected harvest date updated' });
      setEditingHarvestDate(false);
    } catch {
      toast({ title: 'Failed to update harvest date', variant: 'destructive' });
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
                {PLANT_STATUS_ORDER.map(s => (
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
                {PLANT_HEALTH_OPTIONS.map(h => (
                  <SelectItem key={h} value={h} className="capitalize">{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {['seed_started', 'germinated', 'seedling', 'hardening_off', 'transplanted'].includes(plant.status) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Seed Starting Progress</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center overflow-x-auto">
            <SeedStartingTracker
              status={plant.status}
              datePlanted={plant.date_planted}
              dateGerminated={plant.date_germinated}
              dateTransplanted={plant.date_transplanted}
            />
          </CardContent>
        </Card>
      )}

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
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Expected Harvest</span>
            {editingHarvestDate ? (
              <Input
                type="date"
                defaultValue={plant.expected_harvest_date ?? ''}
                className="w-auto h-7 text-sm"
                autoFocus
                onBlur={(e) => {
                  if (e.target.value && e.target.value !== plant.expected_harvest_date) {
                    handleHarvestDateChange(e.target.value);
                  } else {
                    setEditingHarvestDate(false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    if (val && val !== plant.expected_harvest_date) {
                      handleHarvestDateChange(val);
                    } else {
                      setEditingHarvestDate(false);
                    }
                  } else if (e.key === 'Escape') {
                    setEditingHarvestDate(false);
                  }
                }}
              />
            ) : (
              <span className="flex items-center gap-1">
                {plant.expected_harvest_date
                  ? new Date(plant.expected_harvest_date + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
                  : <span className="text-muted-foreground italic">Not set</span>
                }
                <button onClick={() => setEditingHarvestDate(true)} className="text-muted-foreground hover:text-foreground">
                  <Pencil className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
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

      <EntityNotes entityType="plant_instance" entityId={instanceId!} />

      <div className="flex gap-2">
        <Button className="flex-1" onClick={() => setHarvestOpen(true)}>
          Log Harvest
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => setTaskDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          New Task
        </Button>
        {plant.plot_id && (
          <Button variant="outline" className="flex-1" onClick={() => navigate(`/garden/plots/${plant.plot_id}`)}>
            <Map className="w-4 h-4 mr-1" />
            View in Plot
          </Button>
        )}
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

      <CreateTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        entityType="plant_instance"
        entityId={instanceId!}
        entityName={plant.variety_name ? `${plant.common_name} '${plant.variety_name}'` : plant.common_name}
      />
    </div>
  );
}
