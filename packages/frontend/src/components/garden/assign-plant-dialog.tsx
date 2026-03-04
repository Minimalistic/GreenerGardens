import { useState } from 'react';
import { usePlantCatalogSearch } from '@/hooks/use-plant-catalog';
import { useCreatePlantInstance } from '@/hooks/use-plant-instances';
import { PlantTypeBadge } from '@/components/garden/plant-type-badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Sprout, ChevronDown } from 'lucide-react';

const STATUS_ORDER = [
  'planned', 'seed_started', 'germinated', 'seedling', 'hardening_off',
  'transplanted', 'vegetative', 'flowering', 'fruiting', 'harvesting',
  'finished', 'failed', 'removed',
];

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

interface AssignPlantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plotId: string;
  subPlotId: string | null;
}

export function AssignPlantDialog({ open, onOpenChange, plotId, subPlotId }: AssignPlantDialogProps) {
  const { toast } = useToast();
  const createInstance = useCreatePlantInstance();

  const [search, setSearch] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [varietyName, setVarietyName] = useState('');
  const [datePlanted, setDatePlanted] = useState(new Date().toISOString().slice(0, 10));
  const [plantStatus, setPlantStatus] = useState('seed_started');
  const [plantingMethod, setPlantingMethod] = useState('direct_seed');
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [source, setSource] = useState('');
  const [plantNotes, setPlantNotes] = useState('');

  const { data: catalogData } = usePlantCatalogSearch({ search, limit: 10 });
  const catalogResults = catalogData?.data ?? [];

  // Reset form when dialog opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
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
    }
    onOpenChange(nextOpen);
  };

  const handleCreatePlant = async () => {
    if (!selectedCatalogId || !subPlotId) return;
    try {
      await createInstance.mutateAsync({
        plant_catalog_id: selectedCatalogId,
        plot_id: plotId,
        sub_plot_id: subPlotId,
        variety_name: varietyName || undefined,
        status: plantStatus,
        health: 'good',
        date_planted: datePlanted || undefined,
        planting_method: plantingMethod || undefined,
        quantity,
        source: source || undefined,
        notes: plantNotes || undefined,
        tags: [],
      });
      toast({ title: 'Plant assigned!' });
      onOpenChange(false);
    } catch {
      toast({ title: 'Failed to assign plant', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                {catalogResults.map((plant: any) => (
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

          {/* Planting method */}
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

          {/* Status */}
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
  );
}
