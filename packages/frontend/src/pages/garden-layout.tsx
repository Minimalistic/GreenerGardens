import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGardenContext } from '@/contexts/garden-context';
import { useGardens } from '@/hooks/use-gardens';
import { usePlotsByGarden, useCreatePlot, useUpdatePlot, useDeletePlot } from '@/hooks/use-plots';
import { useSubPlotsForPlots } from '@/hooks/use-sub-plots';
import { useCanvasKeyboard } from '@/hooks/use-canvas-keyboard';
import { GardenCanvas, PX_PER_FT } from '@/components/garden/garden-canvas';
import { CanvasContextMenu } from '@/components/garden/canvas-context-menu';
import { GardenManagerDialog } from '@/components/garden/garden-manager-dialog';
import { EmptyState } from '@/components/garden/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Map as MapIcon, Sprout, Trash2, Copy, Clipboard } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Skeleton } from '@/components/ui/skeleton';
import type { SubPlot } from '@gardenvault/shared';

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

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
const mod = isMac ? '\u2318' : 'Ctrl+';

export function GardenLayout() {
  const navigate = useNavigate();
  const { currentGardenId, setCurrentGardenId } = useGardenContext();
  const { data: gardensData, isLoading: gardensLoading } = useGardens();
  const { data: plotsData, isLoading: plotsLoading } = usePlotsByGarden(currentGardenId);
  const createPlot = useCreatePlot();
  const updatePlot = useUpdatePlot();
  const deletePlot = useDeletePlot();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardData | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<PlotFormData>({
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

  const gardens = gardensData?.data ?? [];

  // Auto-select a garden if none is selected but gardens exist
  useEffect(() => {
    if (!currentGardenId && gardens.length > 0) {
      setCurrentGardenId(gardens[0].id);
    }
  }, [currentGardenId, gardens, setCurrentGardenId]);

  const plots = plotsData?.data ?? [];
  const selectedPlot = plots.find((p: any) => p.id === selectedPlotId);

  // Sub-plots for canvas overlay (always loaded)
  const plotIds = useMemo(() => plots.map((p: any) => p.id as string), [plots]);
  const subPlotQueries = useSubPlotsForPlots(plotIds);
  const subPlotsByPlot = useMemo(() => {
    const map = new Map<string, SubPlot[]>();
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
    const plot = plots.find((p: any) => p.id === selectedPlotId);
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
      await createPlot.mutateAsync({
        garden_id: currentGardenId,
        name: `${clipboard.name} (copy)`,
        plot_type: clipboard.plot_type as any,
        dimensions: clipboard.dimensions,
        geometry: {
          ...clipboard.geometry,
          x: clipboard.geometry.x + offsetPx,
          y: clipboard.geometry.y + offsetPx,
        },
        soil_type: clipboard.soil_type,
        sun_exposure: clipboard.sun_exposure as any,
        irrigation: clipboard.irrigation as any,
        is_covered: clipboard.is_covered ?? false,
        tags: clipboard.tags ?? [],
      });
      toast({ title: 'Plot pasted' });
    } catch {
      toast({ title: 'Failed to paste plot', variant: 'destructive' });
    }
  }, [clipboard, currentGardenId, createPlot, toast]);

  const handleDuplicate = useCallback(async () => {
    if (!selectedPlotId) return;
    const plot = plots.find((p: any) => p.id === selectedPlotId);
    if (!plot || !currentGardenId) return;
    const dims = plot.dimensions;
    const defaultW = dims ? dims.width_ft * PX_PER_FT : 120;
    const defaultH = dims ? dims.length_ft * PX_PER_FT : 80;
    const g = plot.geometry ?? { x: PX_PER_FT, y: PX_PER_FT, width: defaultW, height: defaultH, rotation: 0 };
    const offsetPx = 2 * PX_PER_FT;

    try {
      await createPlot.mutateAsync({
        garden_id: currentGardenId,
        name: `${plot.name} (copy)`,
        plot_type: plot.plot_type as any,
        dimensions: plot.dimensions,
        geometry: { ...g, x: g.x + offsetPx, y: g.y + offsetPx },
        soil_type: plot.soil_type,
        sun_exposure: plot.sun_exposure as any,
        irrigation: plot.irrigation as any,
        is_covered: plot.is_covered ?? false,
        tags: plot.tags ?? [],
      });
      toast({ title: 'Plot duplicated' });
    } catch {
      toast({ title: 'Failed to duplicate plot', variant: 'destructive' });
    }
  }, [selectedPlotId, plots, currentGardenId, createPlot, toast]);

  // --- Delete ---

  const handleDeletePlot = useCallback(async (id: string) => {
    if (!confirm('Delete this plot? This cannot be undone.')) return;
    try {
      await deletePlot.mutateAsync({ id, gardenId: currentGardenId! });
      setSelectedPlotId(null);
      toast({ title: 'Plot deleted' });
    } catch {
      toast({ title: 'Failed to delete plot', variant: 'destructive' });
    }
  }, [deletePlot, toast]);

  // --- Keyboard shortcuts ---

  useCanvasKeyboard(
    useMemo(() => ({
      onDelete: () => {
        if (selectedPlotId) handleDeletePlot(selectedPlotId);
      },
      onCopy: handleCopy,
      onPaste: handlePaste,
      onDuplicate: handleDuplicate,
      onEscape: () => {
        setSelectedPlotId(null);
        setContextMenu(null);
      },
    }), [selectedPlotId, handleDeletePlot, handleCopy, handlePaste, handleDuplicate]),
  );

  // --- Context menu ---

  const handleContextMenu = useCallback((e: { x: number; y: number; plotId: string | null }) => {
    setContextMenu(e);
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const onCreatePlot = async (formData: PlotFormData) => {
    if (!currentGardenId) {
      toast({ title: 'No garden selected', description: 'Please select or create a garden first.', variant: 'destructive' });
      return;
    }
    try {
      await createPlot.mutateAsync({
        garden_id: currentGardenId,
        name: formData.name,
        plot_type: formData.plot_type as any,
        dimensions: {
          length_ft: Number(formData.length_ft),
          width_ft: Number(formData.width_ft),
          height_ft: Number(formData.height_ft),
        },
        soil_type: formData.soil_type || undefined,
        sun_exposure: formData.sun_exposure as any,
        irrigation: formData.irrigation as any,
        is_covered: false,
        tags: [],
      });
      toast({ title: 'Plot created!' });
      setDialogOpen(false);
      reset();
    } catch {
      toast({ title: 'Failed to create plot', variant: 'destructive' });
    }
  };

  const handlePlotDragEnd = useCallback(async (plotId: string, geometry: any) => {
    try {
      // Derive physical dimensions from geometry so they stay in sync after resize
      const plot = plots.find((p: any) => p.id === plotId);
      const oldGeom = plot?.geometry;
      const sizeChanged = oldGeom && (oldGeom.width !== geometry.width || oldGeom.height !== geometry.height);

      const data: any = { geometry };
      if (sizeChanged) {
        data.dimensions = {
          width_ft: +(geometry.width / PX_PER_FT).toFixed(1),
          length_ft: +(geometry.height / PX_PER_FT).toFixed(1),
          ...(plot.dimensions?.height_ft != null ? { height_ft: plot.dimensions.height_ft } : {}),
        };
      }

      await updatePlot.mutateAsync({ id: plotId, data });
    } catch {
      // silent fail on drag
    }
  }, [updatePlot, plots]);

  if (gardensLoading || plotsLoading) {
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

  // No gardens exist — prompt user to create one
  if (gardens.length === 0 && !currentGardenId) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Sprout className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Create Your Garden</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Give your garden a name to get started. You can add plots, plants, and more after.
          </p>
          <Button onClick={() => setManagerOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Garden
          </Button>
        </div>
        <GardenManagerDialog open={managerOpen} onOpenChange={setManagerOpen} />
      </>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-12rem)] lg:h-[calc(100vh-8rem)]">
      <div className="flex-1 min-h-[400px] relative">
        {plots.length === 0 ? (
          <EmptyState
            icon={MapIcon}
            title="No Plots Yet"
            description="Create your first plot to start designing your garden layout."
            actionLabel="Create Plot"
            onAction={() => setDialogOpen(true)}
          />
        ) : (
          <GardenCanvas
            plots={plots}
            selectedPlotId={selectedPlotId}
            onSelectPlot={setSelectedPlotId}
            onPlotDragEnd={handlePlotDragEnd}
            onContextMenu={handleContextMenu}
            subPlotsByPlot={subPlotsByPlot}
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
              if (contextMenu.plotId) handleDeletePlot(contextMenu.plotId);
            }}
            onClose={closeContextMenu}
          />
        )}
      </div>

      <div className="w-full lg:w-72 space-y-4">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
            <form onSubmit={handleSubmit(onCreatePlot)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plotName">Name</Label>
                <Input id="plotName" {...register('name', { required: 'Plot name is required' })} placeholder="e.g., Main Raised Bed" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select defaultValue="raised_bed" onValueChange={v => setValue('plot_type', v)}>
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
                  <Input type="number" step="0.5" {...register('length_ft', { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Width (ft)</Label>
                  <Input type="number" step="0.5" {...register('width_ft', { valueAsNumber: true })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Height (ft)</Label>
                  <Input type="number" step="0.5" {...register('height_ft', { valueAsNumber: true })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Sun Exposure</Label>
                <Select defaultValue="full_sun" onValueChange={v => setValue('sun_exposure', v)}>
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
              <CardTitle className="text-base">{(selectedPlot as any).name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground capitalize">
                {(selectedPlot as any).plot_type?.replace('_', ' ')}
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
                  onClick={handleCopy}
                  title="Copy plot"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeletePlot(selectedPlotId!)}
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
              </div>
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
                {plots.map((plot: any) => (
                  <button
                    key={plot.id}
                    className={`w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted transition-colors ${
                      plot.id === selectedPlotId ? 'bg-muted font-medium' : ''
                    }`}
                    onClick={() => setSelectedPlotId(plot.id)}
                  >
                    {plot.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
