import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlot } from '@/hooks/use-plots';
import {
  useSubPlotsWithPlants,
  useCreateSubPlot,
  useUpdateSubPlot,
  useDeleteSubPlot,
} from '@/hooks/use-sub-plots';
import type { SubPlotWithPlant } from '@/hooks/use-sub-plots';
import { usePlantCatalogSearch } from '@/hooks/use-plant-catalog';
import {
  useCreatePlantInstance,
  useDeletePlantInstance,
  useUpdatePlantStatus,
  useUpdatePlantHealth,
  useUpdatePlantInstance,
} from '@/hooks/use-plant-instances';
import { SubPlotCanvas } from '@/components/garden/sub-plot-canvas';
import { EntityNotes } from '@/components/notes/entity-notes';
import { PlantStatusBadge } from '@/components/garden/plant-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUndoRedo } from '@/contexts/undo-redo-context';
import { SuccessionPlantingDialog } from '@/components/garden/succession-planting-dialog';
import { ArrowLeft, Layers, Sprout, Plus, Trash2, X, Copy, ChevronDown, ExternalLink, Pencil, ClipboardList } from 'lucide-react';
import { PlantTypeBadge } from '@/components/garden/plant-type-badge';
import { CreateTaskDialog } from '@/components/garden/create-task-dialog';
import type { PlantInstanceCreate } from '@gardenvault/shared';

const STATUS_ORDER = [
  'planned', 'seed_started', 'germinated', 'seedling', 'hardening_off',
  'transplanted', 'vegetative', 'flowering', 'fruiting', 'harvesting',
  'finished', 'failed', 'removed',
];

const HEALTH_OPTIONS = ['excellent', 'good', 'fair', 'poor', 'critical', 'dead'];

const PLANTING_METHODS = ['direct_seed', 'transplant', 'cutting', 'division', 'layering', 'grafting'];

const STATUSES_BY_METHOD: Record<string, string[]> = {
  direct_seed: ['planned', 'seed_started', 'germinated', 'seedling'],
  transplant: ['planned', 'seedling', 'hardening_off', 'transplanted', 'vegetative', 'flowering', 'fruiting'],
  cutting: ['planned', 'vegetative'],
  division: ['planned', 'vegetative'],
  layering: ['planned', 'vegetative'],
  grafting: ['planned', 'vegetative'],
};

const DEFAULT_STATUS_FOR_METHOD: Record<string, string> = {
  direct_seed: 'seed_started',
  transplant: 'transplanted',
  cutting: 'vegetative',
  division: 'vegetative',
  layering: 'vegetative',
  grafting: 'vegetative',
};

const METHOD_FOR_STATUS: Record<string, string> = {
  seed_started: 'direct_seed',
  germinated: 'direct_seed',
  hardening_off: 'transplant',
  transplanted: 'transplant',
};

export function PlotDetail() {
  const { plotId } = useParams<{ plotId: string }>();
  const navigate = useNavigate();
  const { data: plotData, isLoading } = usePlot(plotId ?? null);
  const { data: subPlotsData } = useSubPlotsWithPlants(plotId ?? null);
  const { toast } = useToast();
  const { push: pushUndo } = useUndoRedo();

  const createSubPlot = useCreateSubPlot();
  const updateSubPlot = useUpdateSubPlot();
  const deleteSubPlot = useDeleteSubPlot();

  const [selectedSubPlotId, setSelectedSubPlotId] = useState<string | null>(null);
  const [plantDialog, setPlantDialog] = useState<{ open: boolean; subPlotId: string | null }>({
    open: false,
    subPlotId: null,
  });
  const [successionOpen, setSuccessionOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [varietyName, setVarietyName] = useState('');
  const [datePlanted, setDatePlanted] = useState('');
  const [plantStatus, setPlantStatus] = useState('seed_started');
  const [plantingMethod, setPlantingMethod] = useState('direct_seed');
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [source, setSource] = useState('');
  const [plantNotes, setPlantNotes] = useState('');
  const [editingHarvestDate, setEditingHarvestDate] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const { data: catalogData } = usePlantCatalogSearch({ search, limit: 10 });
  const createInstance = useCreatePlantInstance();
  const deleteInstance = useDeletePlantInstance();
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
      const result = await createSubPlot.mutateAsync({
        plot_id: plotId,
        grid_position: { row: 0, col: 0 },
        geometry: { x: 0, y: 0, width: 40, height: 40, rotation: 0 },
      });
      const newId = result?.data?.id;
      if (newId) {
        pushUndo({
          label: 'Add sub-plot',
          undo: async () => { await deleteSubPlot.mutateAsync({ id: newId, plotId }); },
          redo: async () => { await createSubPlot.mutateAsync({ plot_id: plotId, grid_position: { row: 0, col: 0 }, geometry: { x: 0, y: 0, width: 40, height: 40, rotation: 0 } }); },
        });
      }
      toast({ title: 'Sub-plot added' });
    } catch {
      toast({ title: 'Failed to add sub-plot', variant: 'destructive' });
    }
  };

  const handleSubPlotDragEnd = async (id: string, geometry: { x: number; y: number; width: number; height: number; rotation: number }) => {
    try {
      const sp = subPlots.find(s => s.id === id);
      const oldGeom = sp?.geometry;
      await updateSubPlot.mutateAsync({ id, data: { geometry } });
      if (oldGeom) {
        pushUndo({
          label: 'Move/resize sub-plot',
          undo: async () => { await updateSubPlot.mutateAsync({ id, data: { geometry: oldGeom } }); },
          redo: async () => { await updateSubPlot.mutateAsync({ id, data: { geometry } }); },
        });
      }
    } catch {
      // silent - will refetch
    }
  };

  const handleSubPlotDoubleClick = (id: string) => {
    setSelectedSubPlotId(id);
    openPlantDialog(id);
  };

  const openPlantDialog = (subPlotId: string) => {
    setPlantDialog({ open: true, subPlotId });
    setSearch('');
    setSelectedCatalogId(null);
    setVarietyName('');
    setDatePlanted(new Date().toISOString().slice(0, 10));
    setPlantStatus('seed_started');
    setPlantingMethod('direct_seed');
    setMoreOptionsOpen(false);
    setQuantity(1);
    setSource('');
    setPlantNotes('');
  };

  const handleCreatePlant = async () => {
    if (!selectedCatalogId || !plotId || !plantDialog.subPlotId) return;
    try {
      const result = await createInstance.mutateAsync({
        plant_catalog_id: selectedCatalogId,
        plot_id: plotId,
        sub_plot_id: plantDialog.subPlotId,
        variety_name: varietyName || undefined,
        status: plantStatus as PlantInstanceCreate['status'],
        health: 'good',
        date_planted: datePlanted || undefined,
        planting_method: (plantingMethod || undefined) as PlantInstanceCreate['planting_method'],
        quantity,
        source: source || undefined,
        notes: plantNotes || undefined,
        tags: [],
      });
      const newId = result?.data?.id;
      if (newId) {
        pushUndo({
          label: 'Assign plant',
          undo: async () => { await deleteInstance.mutateAsync(newId); },
          redo: async () => { await createInstance.mutateAsync({
            plant_catalog_id: selectedCatalogId, plot_id: plotId, sub_plot_id: plantDialog.subPlotId!,
            variety_name: varietyName || undefined, status: plantStatus as PlantInstanceCreate['status'],
            health: 'good', date_planted: datePlanted || undefined,
            planting_method: (plantingMethod || undefined) as PlantInstanceCreate['planting_method'],
            quantity, source: source || undefined, notes: plantNotes || undefined, tags: [],
          }); },
        });
      }
      toast({ title: 'Plant assigned!' });
      setPlantDialog({ open: false, subPlotId: null });
    } catch {
      toast({ title: 'Failed to assign plant', variant: 'destructive' });
    }
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

      const newId = newSubPlot?.data?.id;
      if (newId) {
        pushUndo({
          label: 'Duplicate sub-plot',
          undo: async () => { await deleteSubPlot.mutateAsync({ id: newId, plotId }); },
          redo: async () => { await createSubPlot.mutateAsync({ plot_id: plotId, grid_position: { row: 0, col: 0 }, geometry: { x: sp.geometry.x + offsetPx, y: sp.geometry.y + offsetPx, width: sp.geometry.width, height: sp.geometry.height, rotation: sp.geometry.rotation }, notes: sp.notes || undefined }); },
        });
      }

      toast({ title: 'Sub-plot duplicated' });
    } catch {
      toast({ title: 'Failed to duplicate sub-plot', variant: 'destructive' });
    }
  };

  const handleDeleteSubPlot = async () => {
    if (!selectedSubPlotId || !plotId) return;
    if (!confirm('Delete this sub-plot?')) return;
    const sp = subPlots.find(s => s.id === selectedSubPlotId);
    try {
      await deleteSubPlot.mutateAsync({ id: selectedSubPlotId, plotId });
      if (sp) {
        pushUndo({
          label: 'Delete sub-plot',
          undo: async () => { await createSubPlot.mutateAsync({ plot_id: plotId, grid_position: { row: 0, col: 0 }, geometry: sp.geometry, notes: sp.notes || undefined }); },
          redo: async () => { await deleteSubPlot.mutateAsync({ id: selectedSubPlotId, plotId }); },
        });
      }
      setSelectedSubPlotId(null);
      toast({ title: 'Sub-plot deleted' });
    } catch {
      toast({ title: 'Failed to delete sub-plot', variant: 'destructive' });
    }
  };

  const catalogResults = catalogData?.data ?? [];
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
                          const oldStatus = selectedSubPlot.status ?? 'planned';
                          try {
                            await updateStatus.mutateAsync({ id: selectedSubPlot.plant_instance_id!, status });
                            pushUndo({
                              label: `Change status to ${status.replace('_', ' ')}`,
                              undo: async () => { await updateStatus.mutateAsync({ id: selectedSubPlot.plant_instance_id!, status: oldStatus }); },
                              redo: async () => { await updateStatus.mutateAsync({ id: selectedSubPlot.plant_instance_id!, status }); },
                            });
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
                          const oldHealth = selectedSubPlot.health ?? 'good';
                          try {
                            await updateHealth.mutateAsync({ id: selectedSubPlot.plant_instance_id!, health });
                            pushUndo({
                              label: `Change health to ${health}`,
                              undo: async () => { await updateHealth.mutateAsync({ id: selectedSubPlot.plant_instance_id!, health: oldHealth }); },
                              redo: async () => { await updateHealth.mutateAsync({ id: selectedSubPlot.plant_instance_id!, health }); },
                            });
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
                        <span>{new Date(selectedSubPlot.date_planted + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
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
                            const oldVal = selectedSubPlot.expected_harvest_date;
                            if (val && val !== oldVal) {
                              try {
                                await updatePlantInstance.mutateAsync({ id: selectedSubPlot.plant_instance_id!, data: { expected_harvest_date: val } });
                                pushUndo({
                                  label: 'Change harvest date',
                                  undo: async () => { await updatePlantInstance.mutateAsync({ id: selectedSubPlot.plant_instance_id!, data: { expected_harvest_date: oldVal ?? '' } }); },
                                  redo: async () => { await updatePlantInstance.mutateAsync({ id: selectedSubPlot.plant_instance_id!, data: { expected_harvest_date: val } }); },
                                });
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
                              const oldVal = selectedSubPlot.expected_harvest_date;
                              if (val && val !== oldVal) {
                                try {
                                  await updatePlantInstance.mutateAsync({ id: selectedSubPlot.plant_instance_id!, data: { expected_harvest_date: val } });
                                  pushUndo({
                                    label: 'Change harvest date',
                                    undo: async () => { await updatePlantInstance.mutateAsync({ id: selectedSubPlot.plant_instance_id!, data: { expected_harvest_date: oldVal ?? '' } }); },
                                    redo: async () => { await updatePlantInstance.mutateAsync({ id: selectedSubPlot.plant_instance_id!, data: { expected_harvest_date: val } }); },
                                  });
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
                            ? new Date(selectedSubPlot.expected_harvest_date + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
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
                    onClick={() => openPlantDialog(selectedSubPlotId!)}
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

      {/* Plant assignment dialog */}
      <Dialog open={plantDialog.open} onOpenChange={open => setPlantDialog(p => ({ ...p, open }))}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sprout className="w-5 h-5" />
              Assign Plant
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Plant catalog search */}
            <div className="space-y-2">
              <Label>Search Plant Catalog</Label>
              <Input
                placeholder="Type to search..."
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedCatalogId(null); }}
                autoFocus
              />
              {search && !selectedCatalogId && catalogResults.length > 0 && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {catalogResults.map((plant) => (
                    <button
                      key={plant.id}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${
                        selectedCatalogId === plant.id ? 'bg-muted font-medium' : ''
                      }`}
                      onClick={() => { setSelectedCatalogId(plant.id); setSearch(plant.common_name); }}
                    >
                      {plant.common_name}
                      <PlantTypeBadge plantType={plant.plant_type} className="ml-2 text-[10px] px-1.5 py-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Variety */}
            <div className="space-y-2">
              <Label>Variety (optional)</Label>
              <Input
                placeholder="e.g., Cherokee Purple"
                value={varietyName}
                onChange={e => setVarietyName(e.target.value)}
              />
            </div>

            {/* Date planted */}
            <div className="space-y-2">
              <Label>Date Planted</Label>
              <Input
                type="date"
                value={datePlanted}
                onChange={e => setDatePlanted(e.target.value)}
              />
            </div>

            {/* Planting method (first, since it constrains status) */}
            <div className="space-y-2">
              <Label>Planting Method</Label>
              <Select value={plantingMethod} onValueChange={(method) => {
                setPlantingMethod(method);
                const allowed = STATUSES_BY_METHOD[method] ?? STATUS_ORDER;
                if (!allowed.includes(plantStatus)) {
                  setPlantStatus(DEFAULT_STATUS_FOR_METHOD[method] ?? 'planned');
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANTING_METHODS.map(m => (
                    <SelectItem key={m} value={m} className="capitalize">
                      {m.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status (filtered by planting method) */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={plantStatus} onValueChange={(status) => {
                setPlantStatus(status);
                const requiredMethod = METHOD_FOR_STATUS[status];
                if (requiredMethod && requiredMethod !== plantingMethod) {
                  setPlantingMethod(requiredMethod);
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(STATUSES_BY_METHOD[plantingMethod] ?? STATUS_ORDER).map(s => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* More options collapsible */}
            <div>
              <button
                type="button"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setMoreOptionsOpen(!moreOptionsOpen)}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${moreOptionsOpen ? 'rotate-180' : ''}`} />
                More options
              </button>
              {moreOptionsOpen && (
                <div className="mt-3 space-y-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Source (optional)</Label>
                    <Input
                      placeholder="e.g., Baker Creek Seeds"
                      value={source}
                      onChange={e => setSource(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      placeholder="Any notes about this planting..."
                      value={plantNotes}
                      onChange={e => setPlantNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              disabled={!selectedCatalogId || createInstance.isPending}
              onClick={handleCreatePlant}
            >
              {createInstance.isPending ? 'Assigning...' : 'Assign Plant'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
        entityName={(plot as any).name}
      />
    </div>
  );
}
