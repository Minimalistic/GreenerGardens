import { useState } from 'react';
import { usePlantCatalogSearch } from '@/hooks/use-plant-catalog';
import { useCreateSuccessionPlanting } from '@/hooks/use-plant-instances';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Layers } from 'lucide-react';
import { PlantTypeBadge } from '@/components/garden/plant-type-badge';

const PLANTING_METHODS = [
  { value: 'direct_seed', label: 'Direct Seed' },
  { value: 'transplant', label: 'Transplant' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'division', label: 'Division' },
  { value: 'other', label: 'Other' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plotId: string;
  subPlotId?: string | null;
}

export function SuccessionPlantingDialog({ open, onOpenChange, plotId, subPlotId }: Props) {
  const [search, setSearch] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [intervalDays, setIntervalDays] = useState(14);
  const [count, setCount] = useState(3);
  const [plantingMethod, setPlantingMethod] = useState('direct_seed');

  const { data: catalogData } = usePlantCatalogSearch({ search, limit: 10 });
  const createSuccession = useCreateSuccessionPlanting();
  const { toast } = useToast();

  const catalogResults = catalogData?.data ?? [];

  const handleSubmit = async () => {
    if (!selectedCatalogId) return;
    try {
      await createSuccession.mutateAsync({
        plant_catalog_id: selectedCatalogId,
        plot_id: plotId,
        sub_plot_id: subPlotId ?? undefined,
        start_date: startDate,
        interval_days: intervalDays,
        count,
        planting_method: plantingMethod,
      });
      toast({ title: `Created ${count} succession plantings for ${selectedName}` });
      onOpenChange(false);
      resetForm();
    } catch {
      toast({ title: 'Failed to create succession planting', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setSearch('');
    setSelectedCatalogId(null);
    setSelectedName('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setIntervalDays(14);
    setCount(3);
    setPlantingMethod('direct_seed');
  };

  // Preview the planting dates
  const previewDates = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(startDate + 'T12:00:00');
    d.setDate(d.getDate() + i * intervalDays);
    previewDates.push(d);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Succession Planting
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Plant search */}
          <div className="space-y-2">
            <Label>Plant</Label>
            {selectedCatalogId ? (
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <span className="text-sm font-medium">{selectedName}</span>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedCatalogId(null); setSelectedName(''); setSearch(''); }}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <Input
                  placeholder="Search plant catalog..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
                {search && catalogResults.length > 0 && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {catalogResults.map((plant: any) => (
                      <button
                        key={plant.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => { setSelectedCatalogId(plant.id); setSelectedName(plant.common_name); }}
                      >
                        {plant.common_name}
                        <PlantTypeBadge plantType={plant.plant_type} className="ml-2 text-[10px] px-1.5 py-0" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select value={plantingMethod} onValueChange={setPlantingMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLANTING_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Interval (days)</Label>
              <Input type="number" min={1} max={90} value={intervalDays} onChange={e => setIntervalDays(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Number of Plantings</Label>
              <Input type="number" min={1} max={20} value={count} onChange={e => setCount(Number(e.target.value))} />
            </div>
          </div>

          {/* Preview */}
          {selectedCatalogId && count > 0 && (
            <div className="rounded-md border p-3 bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">Planting Schedule Preview</p>
              <div className="space-y-1">
                {previewDates.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-5 text-muted-foreground text-right">{i + 1}.</span>
                    <span>{d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            className="w-full"
            disabled={!selectedCatalogId || createSuccession.isPending || count < 1}
            onClick={handleSubmit}
          >
            {createSuccession.isPending ? 'Creating...' : `Create ${count} Plantings`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
