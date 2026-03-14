import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGardenContext } from '@/contexts/garden-context';
import { usePlotsByGarden, useCreatePlot, useUpdatePlot, useDeletePlot, usePlotDeletionImpact } from '@/hooks/use-plots';
import { useSubPlotsForPlots, type SubPlotWithPlant } from '@/hooks/use-sub-plots';
import { useGardenObjects, useCreateGardenObject, useUpdateGardenObject, useDeleteGardenObject } from '@/hooks/use-garden-objects';
import { api } from '@/lib/api';
import { useCanvasKeyboard } from '@/hooks/use-canvas-keyboard';
import { useUndoRedo } from '@/contexts/undo-redo-context';
import { GardenCanvas, PX_PER_FT } from '@/components/garden/garden-canvas';
import { CanvasContextMenu } from '@/components/garden/canvas-context-menu';
import { EmptyState } from '@/components/garden/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ContextualNotesPanel } from '@/components/notes/contextual-notes-panel';
import { Plus, Map as MapIcon, Trash2, Copy, Clipboard, Shapes, Lock, Unlock, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { useForm } from 'react-hook-form';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import type { SubPlot, ApiResponse, Plot, PlotCreate, PlotGeometry, GardenObject, GardenObjectGeometry } from '@gardenvault/shared';

interface PlotFormData {
  name: string;
  plot_type: string;
  length_ft: number;
  width_ft: number;
  height_ft: number;
  soil_type: string;
  sun_exposure: string;
  irrigation: string;
}

interface ObjectFormData {
  name: string;
  object_type: string;
  width_ft: number;
  length_ft: number;
}

interface ClipboardData {
  name: string;
  plot_type: string;
  dimensions: { length_ft: number; width_ft: number; height_ft?: number };
  geometry: { x: number; y: number; width: number; height: number; rotation: number };
  soil_type?: string;
  sun_exposure?: string;
  irrigation?: string;
  is_covered?: boolean;
  tags?: string[];
}

interface ContextMenuState {
  x: number;
  y: number;
  plotId: string | null;
}

const OBJECT_TYPES = [
  { value: 'house', label: 'House' },
  { value: 'shed', label: 'Shed' },
  { value: 'greenhouse', label: 'Greenhouse' },
  { value: 'chicken_coop', label: 'Chicken Coop' },
  { value: 'fence', label: 'Fence' },
  { value: 'tree', label: 'Tree' },
  { value: 'path', label: 'Path / Walkway' },
  { value: 'driveway', label: 'Driveway' },
  { value: 'pond', label: 'Pond' },
  { value: 'compost', label: 'Compost' },
  { value: 'patio', label: 'Patio' },
  { value: 'deck', label: 'Deck' },
  { value: 'other', label: 'Other' },
];

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
const mod = isMac ? '\u2318' : 'Ctrl+';

export function GardenLayout() {
  const navigate = useNavigate();
  const { currentGardenId, garden, isLoading: gardenLoading } = useGardenContext();
  const { data: plotsData, isLoading: plotsLoading } = usePlotsByGarden(currentGardenId);
  const { data: objectsData } = useGardenObjects(currentGardenId);
  const createPlot = useCreatePlot();
  const updatePlot = useUpdatePlot();
  const deletePlot = useDeletePlot();
  const createObject = useCreateGardenObject();
  const updateObject = useUpdateGardenObject();
  const deleteObject = useDeleteGardenObject();
  const { toast } = useToast();
  const { push: pushUndo } = useUndoRedo();
  const [plotDialogOpen, setPlotDialogOpen] = useState(false);
  const [objectDialogOpen, setObjectDialogOpen] = useState(false);
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [plotToDelete, setPlotToDelete] = useState<string | null>(null);
  const [objectsLocked, setObjectsLocked] = useState(true);

  const propertyBounds = useMemo(() => {
    const s = garden?.settings;
    if (s?.property_width_ft && s?.property_height_ft) {
      return { width_ft: s.property_width_ft, height_ft: s.property_height_ft };
    }
    return undefined;
  }, [garden]);
  const { data: impactData } = usePlotDeletionImpact(plotToDelete, deleteDialogOpen);

  const plotForm = useForm<PlotFormData>({
    defaultValues: {
      name: '',
      plot_type: 'raised_bed',
      length_ft: 4,
      width_ft: 8,
      height_ft: 1,
      soil_type: '',
      sun_exposure: 'full_sun',
      irrigation: 'hand_watered',
    },
  });

  const objectForm = useForm<ObjectFormData>({
    defaultValues: {
      name: '',
      object_type: 'house',
      width_ft: 10,
      length_ft: 10,
    },
  });

  const plots = plotsData?.data ?? [];
  const gardenObjects = objectsData?.data ?? [];
  const selectedPlot = plots.find((p) => p.id === selectedPlotId);
  const selectedObject = gardenObjects.find((o) => o.id === selectedObjectId);

  // Clear object selection when plot selected and vice versa
  const handleSelectPlot = useCallback((id: string | null) => {
    setSelectedPlotId(id);
    if (id) setSelectedObjectId(null);
  }, []);

  const handleSelectObject = useCallback((id: string | null) => {
    setSelectedObjectId(id);
    if (id) setSelectedPlotId(null);
  }, []);

  // Sub-plots for canvas overlay
  const plotIds = useMemo(() => plots.map((p) => p.id), [plots]);
  const subPlotQueries = useSubPlotsForPlots(plotIds);
  const subPlotsByPlot = useMemo(() => {
    const map = new Map<string, SubPlotWithPlant[]>();
    subPlotQueries.forEach((q, i) => {
      if (q.data?.data) {
        map.set(plotIds[i], q.data.data);
      }
    });
    return map;
  }, [subPlotQueries, plotIds]);

  // --- Copy / Paste / Duplicate ---

  const handleCopy = useCallback(() => {
    if (!selectedPlotId) return;
    const plot = plots.find((p) => p.id === selectedPlotId);
    if (!plot) return;
    const dims = plot.dimensions;
    const defaultW = dims ? dims.width_ft * PX_PER_FT : 120;
    const defaultH = dims ? dims.length_ft * PX_PER_FT : 80;
    const g = plot.geometry ?? { x: PX_PER_FT, y: PX_PER_FT, width: defaultW, height: defaultH, rotation: 0 };

    setClipboard({
      name: plot.name,
      plot_type: plot.plot_type,
      dimensions: plot.dimensions,
      geometry: g,
      soil_type: plot.soil_type,
      sun_exposure: plot.sun_exposure,
      irrigation: plot.irrigation,
      is_covered: plot.is_covered,
      tags: plot.tags,
    });
    toast({ title: 'Plot copied' });
  }, [selectedPlotId, plots, toast]);

  const handlePaste = useCallback(async () => {
    if (!clipboard || !currentGardenId) return;
    try {
      const offsetPx = 2 * PX_PER_FT;
      const pasteData = {
        garden_id: currentGardenId,
        name: `${clipboard.name} (copy)`,
        plot_type: clipboard.plot_type as PlotCreate['plot_type'],
        dimensions: clipboard.dimensions,
        geometry: {
          ...clipboard.geometry,
          x: clipboard.geometry.x + offsetPx,
          y: clipboard.geometry.y + offsetPx,
        },
        soil_type: clipboard.soil_type ?? undefined,
        sun_exposure: clipboard.sun_exposure as PlotCreate['sun_exposure'],
        irrigation: clipboard.irrigation as PlotCreate['irrigation'],
        is_covered: clipboard.is_covered ?? false,
        tags: clipboard.tags ?? [],
      };
      const result = await createPlot.mutateAsync(pasteData);
      const newId = result?.data?.id;
      if (newId) {
        pushUndo({
          label: 'Paste plot',
          undo: async () => { await deletePlot.mutateAsync({ id: newId, gardenId: currentGardenId }); },
          redo: async () => { await createPlot.mutateAsync(pasteData); },
        });
      }
      toast({ title: 'Plot pasted' });
    } catch {
      toast({ title: 'Failed to paste plot', variant: 'destructive' });
    }
  }, [clipboard, currentGardenId, createPlot, deletePlot, toast, pushUndo]);

  const handleDuplicate = useCallback(async () => {
    if (!selectedPlotId) return;
    const plot = plots.find((p) => p.id === selectedPlotId);
    if (!plot || !currentGardenId) return;
    const dims = plot.dimensions;
    const defaultW = dims ? dims.width_ft * PX_PER_FT : 120;
    const defaultH = dims ? dims.length_ft * PX_PER_FT : 80;
    const g = plot.geometry ?? { x: PX_PER_FT, y: PX_PER_FT, width: defaultW, height: defaultH, rotation: 0 };
    const offsetPx = 2 * PX_PER_FT;

    try {
      const newPlot = await createPlot.mutateAsync({
        garden_id: currentGardenId,
        name: `${plot.name} (copy)`,
        plot_type: plot.plot_type as PlotCreate['plot_type'],
        dimensions: plot.dimensions,
        geometry: { ...g, x: g.x + offsetPx, y: g.y + offsetPx },
        soil_type: plot.soil_type ?? undefined,
        sun_exposure: plot.sun_exposure as PlotCreate['sun_exposure'],
        irrigation: plot.irrigation as PlotCreate['irrigation'],
        is_covered: plot.is_covered ?? false,
        tags: plot.tags ?? [],
      });

      // Clone sub-plots (and their plants) into the new plot
      const newPlotId = newPlot?.data?.id;
      if (newPlotId) {
        const spRes = await api.get<ApiResponse<SubPlotWithPlant[]>>(
          `/plots/${selectedPlotId}/sub-plots-with-plants`,
        );
        for (const sp of spRes?.data ?? []) {
          const newSp = await api.post<ApiResponse<SubPlot>>('/sub-plots', {
            plot_id: newPlotId,
            grid_position: { row: 0, col: 0 },
            geometry: sp.geometry,
            notes: sp.notes || undefined,
          });
          if (sp.plant_catalog_id && newSp?.data?.id) {
            await api.post('/plant-instances', {
              plant_catalog_id: sp.plant_catalog_id,
              plot_id: newPlotId,
              sub_plot_id: newSp.data.id,
              variety_name: sp.variety_name || undefined,
              status: 'planned',
              health: 'good',
              quantity: 1,
              tags: [],
            });
          }
        }

        pushUndo({
          label: `Duplicate plot "${plot.name}"`,
          undo: async () => { await deletePlot.mutateAsync({ id: newPlotId, gardenId: currentGardenId }); },
          redo: async () => { await createPlot.mutateAsync({
            garden_id: currentGardenId,
            name: `${plot.name} (copy)`,
            plot_type: plot.plot_type as PlotCreate['plot_type'],
            dimensions: plot.dimensions,
            geometry: { ...g, x: g.x + offsetPx, y: g.y + offsetPx },
            soil_type: plot.soil_type ?? undefined,
            sun_exposure: plot.sun_exposure as PlotCreate['sun_exposure'],
            irrigation: plot.irrigation as PlotCreate['irrigation'],
            is_covered: plot.is_covered ?? false,
            tags: plot.tags ?? [],
          }); },
        });
      }

      toast({ title: 'Plot duplicated' });
    } catch {
      toast({ title: 'Failed to duplicate plot', variant: 'destructive' });
    }
  }, [selectedPlotId, plots, currentGardenId, createPlot, deletePlot, toast, pushUndo]);

  // --- Delete ---

  const openDeleteDialog = useCallback((id: string) => {
    setPlotToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDeletePlot = useCallback(async () => {
    if (!plotToDelete || !currentGardenId) return;
    const plot = plots.find((p) => p.id === plotToDelete);
    try {
      await deletePlot.mutateAsync({ id: plotToDelete, gardenId: currentGardenId });
      if (plot) {
        const plotData = {
          garden_id: currentGardenId,
          name: plot.name,
          plot_type: plot.plot_type as PlotCreate['plot_type'],
          dimensions: plot.dimensions,
          geometry: plot.geometry ?? undefined,
          soil_type: plot.soil_type ?? undefined,
          sun_exposure: plot.sun_exposure as PlotCreate['sun_exposure'],
          irrigation: plot.irrigation as PlotCreate['irrigation'],
          is_covered: plot.is_covered ?? false,
          tags: plot.tags ?? [],
        };
        pushUndo({
          label: `Delete plot "${plot.name}"`,
          undo: async () => { await createPlot.mutateAsync(plotData); },
          redo: async () => { await deletePlot.mutateAsync({ id: plotToDelete, gardenId: currentGardenId }); },
        });
      }
      setSelectedPlotId(null);
      setDeleteDialogOpen(false);
      setPlotToDelete(null);
      toast({ title: 'Plot deleted' });
    } catch {
      toast({ title: 'Failed to delete plot', variant: 'destructive' });
    }
  }, [plotToDelete, deletePlot, createPlot, currentGardenId, toast, plots, pushUndo]);

  const handleDeleteObject = useCallback(async (id: string) => {
    if (!currentGardenId) return;
    const obj = gardenObjects.find((o) => o.id === id);
    try {
      await deleteObject.mutateAsync({ id, gardenId: currentGardenId });
      if (obj) {
        const objData = {
          garden_id: currentGardenId,
          name: obj.name,
          object_type: obj.object_type,
          geometry: obj.geometry,
        };
        pushUndo({
          label: `Delete "${obj.name}"`,
          undo: async () => { await createObject.mutateAsync(objData); },
          redo: async () => { await deleteObject.mutateAsync({ id, gardenId: currentGardenId }); },
        });
      }
      setSelectedObjectId(null);
      toast({ title: 'Object deleted' });
    } catch {
      toast({ title: 'Failed to delete object', variant: 'destructive' });
    }
  }, [currentGardenId, deleteObject, createObject, gardenObjects, toast, pushUndo]);

  // --- Keyboard shortcuts ---

  useCanvasKeyboard(
    useMemo(() => ({
      onDelete: () => {
        if (selectedPlotId) openDeleteDialog(selectedPlotId);
        else if (selectedObjectId) handleDeleteObject(selectedObjectId);
      },
      onCopy: handleCopy,
      onPaste: handlePaste,
      onDuplicate: handleDuplicate,
      onEscape: () => {
        setSelectedPlotId(null);
        setSelectedObjectId(null);
        setContextMenu(null);
      },
    }), [selectedPlotId, selectedObjectId, openDeleteDialog, handleDeleteObject, handleCopy, handlePaste, handleDuplicate]),
  );

  // --- Context menu ---

  const handleContextMenu = useCallback((e: { x: number; y: number; plotId: string | null }) => {
    setContextMenu(e);
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const onCreatePlot = async (formData: PlotFormData) => {
    if (!currentGardenId) return;
    const plotData = {
      garden_id: currentGardenId,
      name: formData.name,
      plot_type: formData.plot_type as PlotCreate['plot_type'],
      dimensions: {
        length_ft: Number(formData.length_ft),
        width_ft: Number(formData.width_ft),
        height_ft: Number(formData.height_ft),
      },
      soil_type: formData.soil_type || undefined,
      sun_exposure: formData.sun_exposure as PlotCreate['sun_exposure'],
      irrigation: formData.irrigation as PlotCreate['irrigation'],
      is_covered: false,
      tags: [] as string[],
    };
    try {
      const result = await createPlot.mutateAsync(plotData);
      const newId = result?.data?.id;
      if (newId) {
        pushUndo({
          label: `Create plot "${formData.name}"`,
          undo: async () => { await deletePlot.mutateAsync({ id: newId, gardenId: currentGardenId }); },
          redo: async () => { await createPlot.mutateAsync(plotData); },
        });
      }
      toast({ title: 'Plot created!' });
      setPlotDialogOpen(false);
      plotForm.reset();
    } catch {
      toast({ title: 'Failed to create plot', variant: 'destructive' });
    }
  };

  const onCreateObject = async (formData: ObjectFormData) => {
    if (!currentGardenId) return;
    const objData = {
      garden_id: currentGardenId,
      name: formData.name,
      object_type: formData.object_type as GardenObject['object_type'],
      geometry: {
        x: PX_PER_FT * 2,
        y: PX_PER_FT * 2,
        width: Number(formData.width_ft) * PX_PER_FT,
        height: Number(formData.length_ft) * PX_PER_FT,
        rotation: 0,
      },
    };
    try {
      const result = await createObject.mutateAsync(objData);
      const newId = result?.data?.id;
      if (newId) {
        pushUndo({
          label: `Place object "${formData.name}"`,
          undo: async () => { await deleteObject.mutateAsync({ id: newId, gardenId: currentGardenId }); },
          redo: async () => { await createObject.mutateAsync(objData); },
        });
      }
      toast({ title: 'Object placed!' });
      setObjectDialogOpen(false);
      objectForm.reset();
    } catch {
      toast({ title: 'Failed to create object', variant: 'destructive' });
    }
  };

  const handlePlotDragEnd = useCallback(async (plotId: string, geometry: PlotGeometry) => {
    try {
      const plot = plots.find((p) => p.id === plotId);
      const oldGeom = plot?.geometry;
      const oldDims = plot?.dimensions;
      const sizeChanged = oldGeom && (oldGeom.width !== geometry.width || oldGeom.height !== geometry.height);

      const data: { geometry: PlotGeometry; dimensions?: { width_ft: number; length_ft: number; height_ft?: number } } = { geometry };
      if (sizeChanged) {
        data.dimensions = {
          width_ft: +(geometry.width / PX_PER_FT).toFixed(1),
          length_ft: +(geometry.height / PX_PER_FT).toFixed(1),
          ...(plot.dimensions?.height_ft != null ? { height_ft: plot.dimensions.height_ft } : {}),
        };
      }

      await updatePlot.mutateAsync({ id: plotId, data });

      if (oldGeom) {
        const undoData: typeof data = { geometry: oldGeom };
        if (sizeChanged && oldDims) {
          undoData.dimensions = { width_ft: oldDims.width_ft, length_ft: oldDims.length_ft, ...(oldDims.height_ft != null ? { height_ft: oldDims.height_ft } : {}) };
        }
        pushUndo({
          label: `Move/resize plot "${plot?.name ?? ''}"`,
          undo: async () => { await updatePlot.mutateAsync({ id: plotId, data: undoData }); },
          redo: async () => { await updatePlot.mutateAsync({ id: plotId, data }); },
        });
      }
    } catch {
      // silent fail on drag
    }
  }, [updatePlot, plots, pushUndo]);

  const handleObjectDragEnd = useCallback(async (objectId: string, geometry: GardenObjectGeometry) => {
    if (!currentGardenId) return;
    try {
      const obj = gardenObjects.find((o) => o.id === objectId);
      const oldGeom = obj?.geometry;
      await updateObject.mutateAsync({ id: objectId, data: { geometry }, gardenId: currentGardenId });
      if (oldGeom) {
        pushUndo({
          label: `Move/resize "${obj?.name ?? 'object'}"`,
          undo: async () => { await updateObject.mutateAsync({ id: objectId, data: { geometry: oldGeom }, gardenId: currentGardenId }); },
          redo: async () => { await updateObject.mutateAsync({ id: objectId, data: { geometry }, gardenId: currentGardenId }); },
        });
      }
    } catch {
      // silent fail on drag
    }
  }, [updateObject, currentGardenId, gardenObjects, pushUndo]);

  if (gardenLoading || plotsLoading) {
    return (
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-12rem)] lg:h-[calc(100vh-8rem)]">
        <div className="flex-1 min-h-[400px]">
          <Skeleton className="w-full h-full rounded-lg" />
        </div>
        <div className="w-full lg:w-72 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  const hasContent = plots.length > 0 || gardenObjects.length > 0;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-12rem)] lg:h-[calc(100vh-8rem)]">
      <div className="flex-1 min-h-[400px] relative">
        {!hasContent ? (
          <EmptyState
            icon={MapIcon}
            title="No Plots Yet"
            description="Create your first plot or place objects to start designing your garden layout."
            actionLabel="Create Plot"
            onAction={() => setPlotDialogOpen(true)}
          />
        ) : (
          <GardenCanvas
            plots={plots}
            gardenObjects={gardenObjects}
            selectedPlotId={selectedPlotId}
            selectedObjectId={selectedObjectId}
            onSelectPlot={handleSelectPlot}
            onSelectObject={handleSelectObject}
            onPlotDragEnd={handlePlotDragEnd}
            onObjectDragEnd={handleObjectDragEnd}
            onContextMenu={handleContextMenu}
            onPlotDoubleClick={(id) => navigate(`/garden/plots/${id}`)}
            subPlotsByPlot={subPlotsByPlot}
            propertyBounds={propertyBounds}
            objectsLocked={objectsLocked}
          />
        )}

        {/* Context menu overlay */}
        {contextMenu && (
          <CanvasContextMenu
            position={{ x: contextMenu.x, y: contextMenu.y }}
            plotId={contextMenu.plotId}
            hasClipboard={!!clipboard}
            onCopy={handleCopy}
            onDuplicate={handleDuplicate}
            onPaste={handlePaste}
            onViewDetails={() => {
              if (contextMenu.plotId) navigate(`/garden/plots/${contextMenu.plotId}`);
            }}
            onDelete={() => {
              if (contextMenu.plotId) openDeleteDialog(contextMenu.plotId);
            }}
            onClose={closeContextMenu}
          />
        )}
      </div>

      <div className="w-full lg:w-72 space-y-4">
        {/* Add Plot */}
        <Dialog open={plotDialogOpen} onOpenChange={setPlotDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Plot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Plot</DialogTitle>
            </DialogHeader>
            <form onSubmit={plotForm.handleSubmit(onCreatePlot)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plotName">Name</Label>
                <Input id="plotName" {...plotForm.register('name', { required: 'Plot name is required' })} placeholder="e.g., Main Raised Bed" />
                {plotForm.formState.errors.name && <p className="text-sm text-destructive">{plotForm.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={plotForm.watch('plot_type')} onValueChange={v => plotForm.setValue('plot_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="raised_bed">Raised Bed</SelectItem>
                    <SelectItem value="in_ground">In-Ground</SelectItem>
                    <SelectItem value="container">Container</SelectItem>
                    <SelectItem value="greenhouse">Greenhouse</SelectItem>
                    <SelectItem value="vertical">Vertical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Length (ft)</Label>
                  <Input type="number" step="0.5" {...plotForm.register('length_ft', { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Width (ft)</Label>
                  <Input type="number" step="0.5" {...plotForm.register('width_ft', { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Height (ft)</Label>
                  <Input type="number" step="0.5" {...plotForm.register('height_ft', { valueAsNumber: true })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sun Exposure</Label>
                <Select value={plotForm.watch('sun_exposure')} onValueChange={v => plotForm.setValue('sun_exposure', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_sun">Full Sun</SelectItem>
                    <SelectItem value="partial_sun">Partial Sun</SelectItem>
                    <SelectItem value="partial_shade">Partial Shade</SelectItem>
                    <SelectItem value="full_shade">Full Shade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createPlot.isPending}>
                {createPlot.isPending ? 'Creating...' : 'Create Plot'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Object */}
        <Dialog open={objectDialogOpen} onOpenChange={setObjectDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Shapes className="w-4 h-4 mr-2" />
              Add Object
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Place Property Object</DialogTitle>
            </DialogHeader>
            <form onSubmit={objectForm.handleSubmit(onCreateObject)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="objName">Name</Label>
                <Input id="objName" {...objectForm.register('name', { required: 'Name is required' })} placeholder="e.g., Main House" />
                {objectForm.formState.errors.name && <p className="text-sm text-destructive">{objectForm.formState.errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={objectForm.watch('object_type')} onValueChange={v => objectForm.setValue('object_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OBJECT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Width (ft)</Label>
                  <Input type="number" step="1" {...objectForm.register('width_ft', { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Length (ft)</Label>
                  <Input type="number" step="1" {...objectForm.register('length_ft', { valueAsNumber: true })} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createObject.isPending}>
                {createObject.isPending ? 'Placing...' : 'Place Object'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Object lock toggle */}
        {gardenObjects.length > 0 && (
          <Button
            variant={objectsLocked ? 'secondary' : 'outline'}
            className="w-full"
            onClick={() => {
              setObjectsLocked(l => !l);
              if (!objectsLocked) {
                setSelectedObjectId(null);
              }
            }}
          >
            {objectsLocked ? (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Objects Locked
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4 mr-2" />
                Objects Unlocked
              </>
            )}
          </Button>
        )}

        {/* Clipboard indicator */}
        {clipboard && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/50 text-xs text-muted-foreground">
            <Clipboard className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{clipboard.name}</span>
            <kbd className="ml-auto text-[10px] bg-background px-1 rounded border">{mod}V</kbd>
          </div>
        )}

        {selectedPlot && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{selectedPlot.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground capitalize">
                {selectedPlot.plot_type?.replace('_', ' ')}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/garden/plots/${selectedPlotId}`)}
                >
                  View Details
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDuplicate}
                  title="Duplicate plot"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => openDeleteDialog(selectedPlotId!)}
                  title="Delete plot"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              {/* Shortcut hints */}
              <div className="text-[10px] text-muted-foreground space-y-0.5 pt-1 border-t">
                <div className="flex justify-between"><span>Copy</span><kbd className="bg-muted px-1 rounded">{mod}C</kbd></div>
                <div className="flex justify-between"><span>Duplicate</span><kbd className="bg-muted px-1 rounded">{mod}D</kbd></div>
                <div className="flex justify-between"><span>Delete</span><kbd className="bg-muted px-1 rounded">Del</kbd></div>
                <div className="flex justify-between"><span>Deselect</span><kbd className="bg-muted px-1 rounded">Esc</kbd></div>
                <div className="flex justify-between"><span>Undo</span><kbd className="bg-muted px-1 rounded">{mod}Z</kbd></div>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedObject && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{selectedObject.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground capitalize">
                {selectedObject.object_type?.replace('_', ' ')}
              </p>
              {selectedObject.geometry && (
                <p className="text-xs text-muted-foreground">
                  {(selectedObject.geometry.width / PX_PER_FT).toFixed(0)}' x {(selectedObject.geometry.height / PX_PER_FT).toFixed(0)}'
                </p>
              )}
              <Button
                size="sm"
                variant="destructive"
                className="w-full"
                onClick={() => handleDeleteObject(selectedObjectId!)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Object
              </Button>
            </CardContent>
          </Card>
        )}

        {plots.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Plots ({plots.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {plots.map((plot) => (
                  <button
                    key={plot.id}
                    className={`w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted transition-colors ${
                      plot.id === selectedPlotId ? 'bg-muted font-medium' : ''
                    }`}
                    onClick={() => handleSelectPlot(plot.id)}
                  >
                    {plot.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {gardenObjects.length > 0 && (
          <Collapsible defaultOpen={false}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Objects ({gardenObjects.length})</CardTitle>
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform [[data-state=open]_&]:rotate-180" />
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <div className="space-y-1">
                    {gardenObjects.map((obj) => (
                      <button
                        key={obj.id}
                        className={`w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted transition-colors ${
                          obj.id === selectedObjectId ? 'bg-muted font-medium' : ''
                        }`}
                        onClick={() => handleSelectObject(obj.id)}
                      >
                        {obj.name}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {currentGardenId && (
          <ContextualNotesPanel entityType="garden" entityId={currentGardenId} entityName="Garden" />
        )}
      </div>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setPlotToDelete(null);
        }}
        title="Delete Plot?"
        description="This will permanently delete this plot and all its contents."
        impacts={impactData?.data ? [
          { label: 'Sub-plots', count: impactData.data.sub_plots },
          { label: 'Plant instances', count: impactData.data.plant_instances },
          { label: 'Harvests', count: impactData.data.harvests },
          { label: 'Soil tests', count: impactData.data.soil_tests },
          { label: 'Notes', count: impactData.data.notes },
        ] : undefined}
        loading={deletePlot.isPending}
        onConfirm={confirmDeletePlot}
      />
    </div>
  );
}
