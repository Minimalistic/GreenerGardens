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
import { useCreatePlantInstance } from '@/hooks/use-plant-instances';
import { SubPlotCanvas } from '@/components/garden/sub-plot-canvas';
import { EntityNotes } from '@/components/notes/entity-notes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { SuccessionPlantingDialog } from '@/components/garden/succession-planting-dialog';
import { ArrowLeft, Layers, Sprout, Plus, Trash2, X, Copy } from 'lucide-react';

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
  const [search, setSearch] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [varietyName, setVarietyName] = useState('');
  const { data: catalogData } = usePlantCatalogSearch({ search, limit: 10 });
  const createInstance = useCreatePlantInstance();

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

  const dims = (plot as any).dimensions;
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
    openPlantDialog(id);
  };

  const openPlantDialog = (subPlotId: string) => {
    setPlantDialog({ open: true, subPlotId });
    setSearch('');
    setSelectedCatalogId(null);
    setVarietyName('');
  };

  const handleCreatePlant = async () => {
    if (!selectedCatalogId || !plotId || !plantDialog.subPlotId) return;
    try {
      await createInstance.mutateAsync({
        plant_catalog_id: selectedCatalogId,
        plot_id: plotId,
        sub_plot_id: plantDialog.subPlotId,
        variety_name: varietyName || undefined,
        status: 'planned',
        health: 'good',
        quantity: 1,
        tags: [],
      });
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
          <h2 className="text-xl font-semibold">{(plot as any).name}</h2>
          <p className="text-sm text-muted-foreground capitalize">
            {(plot as any).plot_type?.replace('_', ' ')}
            {dims && ` - ${dims.length_ft}' x ${dims.width_ft}'`}
          </p>
        </div>
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
                  <CardTitle className="text-base">
                    {selectedSubPlot.plant_name || 'Empty Sub-Plot'}
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
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleRemovePlant}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove Plant
                  </Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sprout className="w-5 h-5" />
              Assign Plant
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Search Plant Catalog</Label>
              <Input
                placeholder="Type to search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
              {search && catalogResults.length > 0 && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {catalogResults.map((plant: any) => (
                    <button
                      key={plant.id}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${
                        selectedCatalogId === plant.id ? 'bg-muted font-medium' : ''
                      }`}
                      onClick={() => setSelectedCatalogId(plant.id)}
                    >
                      {plant.common_name}
                      <span className="text-muted-foreground ml-2 text-xs capitalize">
                        {plant.plant_type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Variety (optional)</Label>
              <Input
                placeholder="e.g., Cherokee Purple"
                value={varietyName}
                onChange={e => setVarietyName(e.target.value)}
              />
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
    </div>
  );
}
