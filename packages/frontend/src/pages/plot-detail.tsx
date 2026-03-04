import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlot } from '@/hooks/use-plots';
import {
  useSubPlotsWithPlants,
  useCreateSubPlot,
  useUpdateSubPlot,
  useDeleteSubPlot,
} from '@/hooks/use-sub-plots';
import type { SubPlotWithPlant } from '@/hooks/use-sub-plots';
import {
  useCreatePlantInstance,
  useUpdatePlantStatus,
  useUpdatePlantHealth,
  useUpdatePlantInstance,
} from '@/hooks/use-plant-instances';
import { SubPlotCanvas } from '@/components/garden/sub-plot-canvas';
import { EntityNotes } from '@/components/notes/entity-notes';
import { PlantStatusBadge } from '@/components/garden/plant-status-badge';
import { AssignPlantDialog } from '@/components/garden/assign-plant-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { SuccessionPlantingDialog } from '@/components/garden/succession-planting-dialog';
import { ArrowLeft, Layers, Sprout, Plus, Trash2, X, Copy, ExternalLink, Pencil, ClipboardList } from 'lucide-react';
import { CreateTaskDialog } from '@/components/garden/create-task-dialog';
import { formatFullDate } from '@/lib/format-date';

const STATUS_ORDER = [
  'planned', 'seed_started', 'germinated', 'seedling', 'hardening_off',
  'transplanted', 'vegetative', 'flowering', 'fruiting', 'harvesting',
  'finished', 'failed', 'removed',
];

const HEALTH_OPTIONS = ['excellent', 'good', 'fair', 'poor', 'critical', 'dead'];

export function PlotDetail() {
  const { plotId } = useParams<{ plotId: string }>();
  const navigate = useNavigate();
  const { data: plotData, isLoading } = usePlot(plotId ?? null);
  const { data: subPlotsData } = useSubPlotsWithPlants(plotId ?? null);
  const { toast } = useToast();

  const createSubPlot = useCreateSubPlot();
  const updateSubPlot = useUpdateSubPlot();
  const deleteSubPlot = useDeleteSubPlot();

  const [selectedSubPlotId, setSelectedSubPlotId] = useState<string | null>(null);
  const [plantDialog, setPlantDialog] = useState<{ open: boolean; subPlotId: string | null }>({
    open: false,
    subPlotId: null,
  });
  const [successionOpen, setSuccessionOpen] = useState(false);
  const [editingHarvestDate, setEditingHarvestDate] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const createInstance = useCreatePlantInstance();
  const updateStatus = useUpdatePlantStatus();
  const updateHealth = useUpdatePlantHealth();
  const updatePlantInstance = useUpdatePlantInstance();

  const plot = plotData?.data;
  const subPlots: SubPlotWithPlant[] = subPlotsData?.data ?? [];
  const selectedSubPlot = subPlots.find(sp => sp.id === selectedSubPlotId) ?? null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!plot) return <p>Plot not found</p>;

  const dims = plot.dimensions;
  const widthFt = dims?.width_ft ?? 4;
  const lengthFt = dims?.length_ft ?? 4;

  const handleAddSubPlot = async () => {
    if (!plotId) return;
    try {
      await createSubPlot.mutateAsync({
        plot_id: plotId,
        grid_position: { row: 0, col: 0 },
        geometry: { x: 0, y: 0, width: 40, height: 40, rotation: 0 },
      });
      toast({ title: 'Sub-plot added' });
    } catch {
      toast({ title: 'Failed to add sub-plot', variant: 'destructive' });
    }
  };

  const handleSubPlotDragEnd = async (id: string, geometry: { x: number; y: number; width: number; height: number; rotation: number }) => {
    try {
      await updateSubPlot.mutateAsync({ id, data: { geometry } });
    } catch {
      // silent - will refetch
    }
  };

  const handleSubPlotDoubleClick = (id: string) => {
    setSelectedSubPlotId(id);
    setPlantDialog({ open: true, subPlotId: id });
  };

  const handleRemovePlant = async () => {
    if (!selectedSubPlotId) return;
    try {
      await updateSubPlot.mutateAsync({
        id: selectedSubPlotId,
        data: { plant_instance_id: null },
      });
      toast({ title: 'Plant removed from sub-plot' });
    } catch {
      toast({ title: 'Failed to remove plant', variant: 'destructive' });
    }
  };

  const handleDuplicateSubPlot = async () => {
    if (!selectedSubPlotId || !plotId) return;
    const sp = subPlots.find(s => s.id === selectedSubPlotId);
    if (!sp) return;
    const offsetPx = 40; // 1ft
    try {
      const newSubPlot = await createSubPlot.mutateAsync({
        plot_id: plotId,
        grid_position: { row: 0, col: 0 },
        geometry: {
          x: sp.geometry.x + offsetPx,
          y: sp.geometry.y + offsetPx,
          width: sp.geometry.width,
          height: sp.geometry.height,
          rotation: sp.geometry.rotation,
        },
        notes: sp.notes || undefined,
      });

      // Also duplicate the plant if one is assigned
      if (sp.plant_catalog_id && newSubPlot?.data?.id) {
        await createInstance.mutateAsync({
          plant_catalog_id: sp.plant_catalog_id,
          plot_id: plotId,
          sub_plot_id: newSubPlot.data.id,
          variety_name: sp.variety_name || undefined,
          status: 'planned',
          health: 'good',
          quantity: 1,
          tags: [],
        });
      }

      toast({ title: 'Sub-plot duplicated' });
    } catch {
      toast({ title: 'Failed to duplicate sub-plot', variant: 'destructive' });
    }
  };

  const handleDeleteSubPlot = async () => {
    if (!selectedSubPlotId) return;
    if (!confirm('Delete this sub-plot?')) return;
    try {
      await deleteSubPlot.mutateAsync({ id: selectedSubPlotId, plotId: plotId! });
      setSelectedSubPlotId(null);
      toast({ title: 'Sub-plot deleted' });
    } catch {
      toast({ title: 'Failed to delete sub-plot', variant: 'destructive' });
    }
  };

  const selectedGeometry = selectedSubPlot?.geometry;
  const selectedWidthFt = selectedGeometry ? (selectedGeometry.width / 40).toFixed(1).replace(/\.0$/, '') : '';
  const selectedHeightFt = selectedGeometry ? (selectedGeometry.height / 40).toFixed(1).replace(/\.0$/, '') : '';

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/garden')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{plot.name}</h2>
          <p className="text-sm text-muted-foreground capitalize">
            {plot.plot_type?.replace('_', ' ')}
            {dims && ` - ${dims.length_ft}' x ${dims.width_ft}'`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTaskDialogOpen(true)}>
          <ClipboardList className="w-4 h-4 mr-1" />
          New Task
        </Button>
        <Button variant="outline" size="sm" onClick={() => setSuccessionOpen(true)}>
          <Layers className="w-4 h-4 mr-1" />
          Succession
        </Button>
      </div>

      {/* Canvas + Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 min-w-0">
          <SubPlotCanvas
            widthFt={widthFt}
            lengthFt={lengthFt}
            subPlots={subPlots}
            selectedSubPlotId={selectedSubPlotId}
            onSelectSubPlot={setSelectedSubPlotId}
            onSubPlotDragEnd={handleSubPlotDragEnd}
            onSubPlotDoubleClick={handleSubPlotDoubleClick}
          />
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-72 space-y-4">
          <Button className="w-full" onClick={handleAddSubPlot} disabled={createSubPlot.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            {createSubPlot.isPending ? 'Adding...' : 'Add Sub-Plot'}
          </Button>

          {selectedSubPlot ? (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {selectedSubPlot.plant_name || 'Empty Sub-Plot'}
                    {selectedSubPlot.status && <PlantStatusBadge status={selectedSubPlot.status} className="text-[10px] px-1.5 py-0" />}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setSelectedSubPlotId(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {selectedWidthFt}' x {selectedHeightFt}'
                </p>

                {selectedSubPlot.plant_instance_id ? (
                  <>
                    {/* Status */}
                    <div className="space-y-1">
                      <Label className="text-xs">Status</Label>
                      <Select
                        value={selectedSubPlot.status ?? 'planned'}
                        onValueChange={async (status) => {
                          try {
                            await updateStatus.mutateAsync({ id: selectedSubPlot.plant_instance_id!, status });
                            toast({ title: `Status updated to ${status.replace('_', ' ')}` });
                          } catch {
                            toast({ title: 'Failed to update status', variant: 'destructive' });
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_ORDER.map(s => (
                            <SelectItem key={s} value={s} className="capitalize text-xs">
                              {s.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Health */}
                    <div className="space-y-1">
                      <Label className="text-xs">Health</Label>
                      <Select
                        value={selectedSubPlot.health ?? 'good'}
                        onValueChange={async (health) => {
                          try {
                            await updateHealth.mutateAsync({ id: selectedSubPlot.plant_instance_id!, health });
                            toast({ title: `Health updated to ${health}` });
                          } catch {
                            toast({ title: 'Failed to update health', variant: 'destructive' });
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HEALTH_OPTIONS.map(h => (
                            <SelectItem key={h} value={h} className="capitalize text-xs">{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date planted (read-only) */}
                    {selectedSubPlot.date_planted && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Planted</span>
                        <span>{formatFullDate(selectedSubPlot.date_planted)}</span>
                      </div>
                    )}

                    {/* Expected harvest date (editable) */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Expected Harvest</span>
                        {!editingHarvestDate && (
                          <button onClick={() => setEditingHarvestDate(true)} className="text-muted-foreground hover:text-foreground">
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {editingHarvestDate ? (
                        <Input
                          type="date"
                          defaultValue={selectedSubPlot.expected_harvest_date ?? ''}
                          className="h-8 text-xs"
                          autoFocus
                          onBlur={async (e) => {
                            const val = e.target.value;
                            if (val && val !== selectedSubPlot.expected_harvest_date) {
                              try {
                                await updatePlantInstance.mutateAsync({ id: selectedSubPlot.plant_instance_id!, data: { expected_harvest_date: val } });
                                toast({ title: 'Expected harvest date updated' });
                              } catch {
                                toast({ title: 'Failed to update', variant: 'destructive' });
                              }
                            }
                            setEditingHarvestDate(false);
                          }}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              const val = (e.target as HTMLInputElement).value;
                              if (val && val !== selectedSubPlot.expected_harvest_date) {
                                try {
                                  await updatePlantInstance.mutateAsync({ id: selectedSubPlot.plant_instance_id!, data: { expected_harvest_date: val } });
                                  toast({ title: 'Expected harvest date updated' });
                                } catch {
                                  toast({ title: 'Failed to update', variant: 'destructive' });
                                }
                              }
                              setEditingHarvestDate(false);
                            } else if (e.key === 'Escape') {
                              setEditingHarvestDate(false);
                            }
                          }}
                        />
                      ) : (
                        <p className="text-xs">
                          {selectedSubPlot.expected_harvest_date
                            ? formatFullDate(selectedSubPlot.expected_harvest_date)
                            : <span className="text-muted-foreground italic">Not set</span>
                          }
                        </p>
                      )}
                    </div>

                    {/* View Details link */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/plants/${selectedSubPlot.plant_instance_id}`)}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View Details
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={handleRemovePlant}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove Plant
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setPlantDialog({ open: true, subPlotId: selectedSubPlotId! })}
                  >
                    <Sprout className="w-4 h-4 mr-1" />
                    Assign Plant
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleDuplicateSubPlot}
                  disabled={createSubPlot.isPending}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Duplicate
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={handleDeleteSubPlot}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete Sub-Plot
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">
                  {subPlots.length === 0
                    ? 'Click "Add Sub-Plot" to create your first sub-plot.'
                    : 'Click a sub-plot to select it, or double-click to assign a plant.'}
                </p>
              </CardContent>
            </Card>
          )}

          {subPlots.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Sub-Plots ({subPlots.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {subPlots.map((sp) => (
                    <button
                      key={sp.id}
                      className={`w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted transition-colors ${
                        sp.id === selectedSubPlotId ? 'bg-muted font-medium' : ''
                      }`}
                      onClick={() => setSelectedSubPlotId(sp.id)}
                    >
                      {sp.plant_name || 'Empty'}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({(sp.geometry.width / 40).toFixed(1).replace(/\.0$/, '')}' x{' '}
                        {(sp.geometry.height / 40).toFixed(1).replace(/\.0$/, '')}')
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <EntityNotes entityType="plot" entityId={plotId!} />
        </div>
      </div>

      <AssignPlantDialog
        open={plantDialog.open}
        onOpenChange={open => setPlantDialog(p => ({ ...p, open }))}
        plotId={plotId!}
        subPlotId={plantDialog.subPlotId}
      />

      <SuccessionPlantingDialog
        open={successionOpen}
        onOpenChange={setSuccessionOpen}
        plotId={plotId!}
      />

      <CreateTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        entityType="plot"
        entityId={plotId!}
        entityName={plot.name}
      />
    </div>
  );
}
