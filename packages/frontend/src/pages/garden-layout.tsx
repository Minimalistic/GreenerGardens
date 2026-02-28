import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGardenContext } from '@/contexts/garden-context';
import { usePlotsByGarden, useCreatePlot, useUpdatePlot, useDeletePlot } from '@/hooks/use-plots';
import { GardenCanvas } from '@/components/garden/garden-canvas';
import { EmptyState } from '@/components/garden/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Map, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

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

export function GardenLayout() {
  const navigate = useNavigate();
  const { currentGardenId } = useGardenContext();
  const { data: plotsData, isLoading } = usePlotsByGarden(currentGardenId);
  const createPlot = useCreatePlot();
  const updatePlot = useUpdatePlot();
  const deletePlot = useDeletePlot();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);

  const { register, handleSubmit, reset, setValue } = useForm<PlotFormData>({
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

  const plots = plotsData?.data ?? [];
  const selectedPlot = plots.find((p: any) => p.id === selectedPlotId);

  const onCreatePlot = async (formData: PlotFormData) => {
    if (!currentGardenId) return;
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
      await updatePlot.mutateAsync({ id: plotId, data: { geometry } });
    } catch {
      // silent fail on drag
    }
  }, [updatePlot]);

  const handleDeletePlot = async (id: string) => {
    try {
      await deletePlot.mutateAsync(id);
      setSelectedPlotId(null);
      toast({ title: 'Plot deleted' });
    } catch {
      toast({ title: 'Failed to delete plot', variant: 'destructive' });
    }
  };

  if (isLoading) return null;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-12rem)] lg:h-[calc(100vh-8rem)]">
      <div className="flex-1 min-h-[400px]">
        {plots.length === 0 ? (
          <EmptyState
            icon={Map}
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
                <Input id="plotName" {...register('name', { required: true })} placeholder="e.g., Main Raised Bed" />
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
                  variant="destructive"
                  onClick={() => handleDeletePlot(selectedPlotId!)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
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
