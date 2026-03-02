import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import {
  useCreatePlantCatalogEntry,
  useUpdatePlantCatalogEntry,
  useDeletePlantCatalogEntry,
} from '@/hooks/use-plant-catalog';
import { Trash2 } from 'lucide-react';

const PLANT_TYPES = ['vegetable', 'fruit', 'herb', 'flower', 'tree', 'shrub', 'vine', 'grass', 'succulent', 'other'] as const;
const LIFECYCLES = ['annual', 'biennial', 'perennial'] as const;
const SUN_OPTIONS = ['full_sun', 'partial_sun', 'partial_shade', 'full_shade'] as const;
const WATER_OPTIONS = ['low', 'moderate', 'high', 'very_high'] as const;

interface PlantFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant?: Record<string, any>;
  onDeleted?: () => void;
}

const EMPTY_FORM = {
  common_name: '',
  scientific_name: '',
  family: '',
  plant_type: 'vegetable' as string,
  lifecycle: '' as string,
  description: '',
  image_url: '',
  sun_exposure: '' as string,
  water_needs: '' as string,
  min_zone: '',
  max_zone: '',
  soil_ph_min: '',
  soil_ph_max: '',
  spacing_inches: '',
  row_spacing_inches: '',
  height_inches_min: '',
  height_inches_max: '',
  planting_depth_inches: '',
  days_to_germination_min: '',
  days_to_germination_max: '',
  days_to_maturity_min: '',
  days_to_maturity_max: '',
  indoor_start_weeks_before_frost: '',
  outdoor_sow_weeks_after_frost: '',
  transplant_weeks_after_last_frost: '',
  succession_planting_interval_days: '',
  harvest_instructions: '',
  storage_instructions: '',
  companions: '',
  antagonists: '',
};

function plantToForm(plant: Record<string, any>) {
  return {
    common_name: plant.common_name ?? '',
    scientific_name: plant.scientific_name ?? '',
    family: plant.family ?? '',
    plant_type: plant.plant_type ?? 'vegetable',
    lifecycle: plant.lifecycle ?? '',
    description: plant.description ?? '',
    image_url: plant.image_url ?? '',
    sun_exposure: plant.sun_exposure ?? '',
    water_needs: plant.water_needs ?? '',
    min_zone: plant.min_zone?.toString() ?? '',
    max_zone: plant.max_zone?.toString() ?? '',
    soil_ph_min: plant.soil_ph_min?.toString() ?? '',
    soil_ph_max: plant.soil_ph_max?.toString() ?? '',
    spacing_inches: plant.spacing_inches?.toString() ?? '',
    row_spacing_inches: plant.row_spacing_inches?.toString() ?? '',
    height_inches_min: plant.height_inches_min?.toString() ?? '',
    height_inches_max: plant.height_inches_max?.toString() ?? '',
    planting_depth_inches: plant.planting_depth_inches?.toString() ?? '',
    days_to_germination_min: plant.days_to_germination_min?.toString() ?? '',
    days_to_germination_max: plant.days_to_germination_max?.toString() ?? '',
    days_to_maturity_min: plant.days_to_maturity_min?.toString() ?? '',
    days_to_maturity_max: plant.days_to_maturity_max?.toString() ?? '',
    indoor_start_weeks_before_frost: plant.indoor_start_weeks_before_frost?.toString() ?? '',
    outdoor_sow_weeks_after_frost: plant.outdoor_sow_weeks_after_frost?.toString() ?? '',
    transplant_weeks_after_last_frost: plant.transplant_weeks_after_last_frost?.toString() ?? '',
    succession_planting_interval_days: plant.succession_planting_interval_days?.toString() ?? '',
    harvest_instructions: plant.harvest_instructions ?? '',
    storage_instructions: plant.storage_instructions ?? '',
    companions: (plant.companions ?? []).join(', '),
    antagonists: (plant.antagonists ?? []).join(', '),
  };
}

function formToPayload(form: typeof EMPTY_FORM) {
  const optStr = (v: string) => v.trim() || undefined;
  const optNum = (v: string) => { const n = Number(v); return v && !isNaN(n) ? n : undefined; };
  const optInt = (v: string) => { const n = parseInt(v, 10); return v && !isNaN(n) ? n : undefined; };
  const csvToArr = (v: string) => {
    const items = v.split(',').map(s => s.trim()).filter(Boolean);
    return items.length > 0 ? items : undefined;
  };

  return {
    common_name: form.common_name.trim(),
    scientific_name: optStr(form.scientific_name),
    family: optStr(form.family),
    plant_type: form.plant_type as any,
    lifecycle: (form.lifecycle || undefined) as any,
    description: optStr(form.description),
    image_url: optStr(form.image_url),
    sun_exposure: (form.sun_exposure || undefined) as any,
    water_needs: (form.water_needs || undefined) as any,
    min_zone: optInt(form.min_zone),
    max_zone: optInt(form.max_zone),
    soil_ph_min: optNum(form.soil_ph_min),
    soil_ph_max: optNum(form.soil_ph_max),
    spacing_inches: optNum(form.spacing_inches),
    row_spacing_inches: optNum(form.row_spacing_inches),
    height_inches_min: optNum(form.height_inches_min),
    height_inches_max: optNum(form.height_inches_max),
    planting_depth_inches: optNum(form.planting_depth_inches),
    days_to_germination_min: optInt(form.days_to_germination_min),
    days_to_germination_max: optInt(form.days_to_germination_max),
    days_to_maturity_min: optInt(form.days_to_maturity_min),
    days_to_maturity_max: optInt(form.days_to_maturity_max),
    indoor_start_weeks_before_frost: optInt(form.indoor_start_weeks_before_frost),
    outdoor_sow_weeks_after_frost: optInt(form.outdoor_sow_weeks_after_frost),
    transplant_weeks_after_last_frost: optInt(form.transplant_weeks_after_last_frost),
    succession_planting_interval_days: optInt(form.succession_planting_interval_days),
    harvest_instructions: optStr(form.harvest_instructions),
    storage_instructions: optStr(form.storage_instructions),
    companions: csvToArr(form.companions),
    antagonists: csvToArr(form.antagonists),
  };
}

export function PlantFormDialog({ open, onOpenChange, plant, onDeleted }: PlantFormDialogProps) {
  const isEdit = !!plant;
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const createMutation = useCreatePlantCatalogEntry();
  const updateMutation = useUpdatePlantCatalogEntry();
  const deleteMutation = useDeletePlantCatalogEntry();

  useEffect(() => {
    if (open) {
      setForm(plant ? plantToForm(plant) : EMPTY_FORM);
    }
  }, [open, plant]);

  const set = (key: keyof typeof EMPTY_FORM) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const setSelect = (key: keyof typeof EMPTY_FORM) => (value: string) =>
    setForm(prev => ({ ...prev, [key]: value === ' ' ? '' : value }));

  const saving = createMutation.isPending || updateMutation.isPending;

  const handleSave = () => {
    const payload = formToPayload(form);
    if (!payload.common_name || !payload.plant_type) return;

    if (isEdit) {
      updateMutation.mutate(
        { id: plant.id, data: payload },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createMutation.mutate(payload as any, {
        onSuccess: () => onOpenChange(false),
      });
    }
  };

  const handleDelete = () => {
    if (!plant) return;
    deleteMutation.mutate(plant.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        onOpenChange(false);
        onDeleted?.();
      },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Plant' : 'Add Custom Plant'}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="mt-2">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="growing">Growing</TabsTrigger>
              <TabsTrigger value="planting">Planting</TabsTrigger>
              <TabsTrigger value="harvest">Harvest</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-3 mt-3">
              <Field label="Common Name *" value={form.common_name} onChange={set('common_name')} />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Plant Type *</Label>
                  <Select value={form.plant_type} onValueChange={setSelect('plant_type')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLANT_TYPES.map(t => (
                        <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Lifecycle</Label>
                  <Select value={form.lifecycle || ' '} onValueChange={setSelect('lifecycle')}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" ">None</SelectItem>
                      {LIFECYCLES.map(l => (
                        <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Field label="Scientific Name" value={form.scientific_name} onChange={set('scientific_name')} />
              <Field label="Family" value={form.family} onChange={set('family')} />
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={set('description')} rows={3} />
              </div>
              <Field label="Image URL" value={form.image_url} onChange={set('image_url')} />
            </TabsContent>

            <TabsContent value="growing" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Sun Exposure</Label>
                  <Select value={form.sun_exposure || ' '} onValueChange={setSelect('sun_exposure')}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" ">None</SelectItem>
                      {SUN_OPTIONS.map(s => (
                        <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Water Needs</Label>
                  <Select value={form.water_needs || ' '} onValueChange={setSelect('water_needs')}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" ">None</SelectItem>
                      {WATER_OPTIONS.map(w => (
                        <SelectItem key={w} value={w} className="capitalize">{w.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min USDA Zone" type="number" value={form.min_zone} onChange={set('min_zone')} />
                <Field label="Max USDA Zone" type="number" value={form.max_zone} onChange={set('max_zone')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Soil pH Min" type="number" value={form.soil_ph_min} onChange={set('soil_ph_min')} step="0.1" />
                <Field label="Soil pH Max" type="number" value={form.soil_ph_max} onChange={set('soil_ph_max')} step="0.1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Spacing (in)" type="number" value={form.spacing_inches} onChange={set('spacing_inches')} />
                <Field label="Row Spacing (in)" type="number" value={form.row_spacing_inches} onChange={set('row_spacing_inches')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Height Min (in)" type="number" value={form.height_inches_min} onChange={set('height_inches_min')} />
                <Field label="Height Max (in)" type="number" value={form.height_inches_max} onChange={set('height_inches_max')} />
              </div>
            </TabsContent>

            <TabsContent value="planting" className="space-y-3 mt-3">
              <Field label="Planting Depth (in)" type="number" value={form.planting_depth_inches} onChange={set('planting_depth_inches')} step="0.25" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Germination Min (days)" type="number" value={form.days_to_germination_min} onChange={set('days_to_germination_min')} />
                <Field label="Germination Max (days)" type="number" value={form.days_to_germination_max} onChange={set('days_to_germination_max')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Maturity Min (days)" type="number" value={form.days_to_maturity_min} onChange={set('days_to_maturity_min')} />
                <Field label="Maturity Max (days)" type="number" value={form.days_to_maturity_max} onChange={set('days_to_maturity_max')} />
              </div>
              <Field label="Start Indoors (weeks before frost)" type="number" value={form.indoor_start_weeks_before_frost} onChange={set('indoor_start_weeks_before_frost')} />
              <Field label="Direct Sow (weeks after frost)" type="number" value={form.outdoor_sow_weeks_after_frost} onChange={set('outdoor_sow_weeks_after_frost')} />
              <Field label="Transplant (weeks after last frost)" type="number" value={form.transplant_weeks_after_last_frost} onChange={set('transplant_weeks_after_last_frost')} />
              <Field label="Succession Interval (days)" type="number" value={form.succession_planting_interval_days} onChange={set('succession_planting_interval_days')} />
            </TabsContent>

            <TabsContent value="harvest" className="space-y-3 mt-3">
              <div className="space-y-1">
                <Label>Harvest Instructions</Label>
                <Textarea value={form.harvest_instructions} onChange={set('harvest_instructions')} rows={3} />
              </div>
              <div className="space-y-1">
                <Label>Storage Instructions</Label>
                <Textarea value={form.storage_instructions} onChange={set('storage_instructions')} rows={3} />
              </div>
              <div className="space-y-1">
                <Label>Companions (comma-separated)</Label>
                <Input value={form.companions} onChange={set('companions')} placeholder="Basil, Carrot, Marigold" />
              </div>
              <div className="space-y-1">
                <Label>Antagonists (comma-separated)</Label>
                <Input value={form.antagonists} onChange={set('antagonists')} placeholder="Fennel, Cabbage" />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex justify-between sm:justify-between">
            {isEdit && (
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.common_name.trim()}>
                {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Plant'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isEdit && (
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete Custom Plant"
          description={`Are you sure you want to delete "${plant?.common_name}"? This cannot be undone.`}
          loading={deleteMutation.isPending}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  step,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={onChange} step={step} />
    </div>
  );
}
