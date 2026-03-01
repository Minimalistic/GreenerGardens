import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePlot } from '@/hooks/use-plots';
import { useSubPlotsByPlot } from '@/hooks/use-sub-plots';
import { usePlantCatalogSearch } from '@/hooks/use-plant-catalog';
import { useCreatePlantInstance } from '@/hooks/use-plant-instances';
import { SubPlotGrid } from '@/components/garden/sub-plot-grid';
import { PlantStatusBadge } from '@/components/garden/plant-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { SuccessionPlantingDialog } from '@/components/garden/succession-planting-dialog';
import { ArrowLeft, Layers, Sprout } from 'lucide-react';

export function PlotDetail() {
  const { plotId } = useParams<{ plotId: string }>();
  const navigate = useNavigate();
  const { data: plotData, isLoading } = usePlot(plotId ?? null);
  const { data: subPlotsData } = useSubPlotsByPlot(plotId ?? null);
  const { toast } = useToast();

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
  const subPlots = subPlotsData?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!plot) return <p>Plot not found</p>;

  const handlePlantHere = (subPlotId: string) => {
    setPlantDialog({ open: true, subPlotId });
    setSearch('');
    setSelectedCatalogId(null);
    setVarietyName('');
  };

  const handleCreatePlant = async () => {
    if (!selectedCatalogId || !plotId) return;
    try {
      await createInstance.mutateAsync({
        plant_catalog_id: selectedCatalogId,
        plot_id: plotId,
        sub_plot_id: plantDialog.subPlotId,
        variety_name: varietyName || undefined,
        status: 'planned',
        health: 'good',
        quantity: 1,
      });
      toast({ title: 'Plant added!' });
      setPlantDialog({ open: false, subPlotId: null });
    } catch {
      toast({ title: 'Failed to add plant', variant: 'destructive' });
    }
  };

  const catalogResults = catalogData?.data ?? [];

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/garden')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{(plot as any).name}</h2>
          <p className="text-sm text-muted-foreground capitalize">
            {(plot as any).plot_type?.replace('_', ' ')}
            {(plot as any).dimensions &&
              ` - ${(plot as any).dimensions.length_ft}' x ${(plot as any).dimensions.width_ft}'`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSuccessionOpen(true)}>
          <Layers className="w-4 h-4 mr-1" />
          Succession
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sub-Plot Grid</CardTitle>
        </CardHeader>
        <CardContent>
          <SubPlotGrid
            subPlots={subPlots}
            cols={Math.max(1, Math.floor((plot as any).dimensions?.length_ft ?? 4))}
            onCellClick={handlePlantHere}
          />
        </CardContent>
      </Card>

      <Dialog open={plantDialog.open} onOpenChange={open => setPlantDialog(p => ({ ...p, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sprout className="w-5 h-5" />
              Plant Here
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
              {createInstance.isPending ? 'Planting...' : 'Plant Here'}
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
