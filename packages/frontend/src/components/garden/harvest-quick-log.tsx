import { useForm } from 'react-hook-form';
import { useCreateHarvest } from '@/hooks/use-harvests';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { HarvestUnit, HarvestQuality, HarvestDestination } from '@gardenvault/shared';

const UNITS = ['lb', 'oz', 'kg', 'g', 'count', 'bunch', 'basket', 'pint', 'quart', 'gallon'];
const QUALITY = ['excellent', 'good', 'fair', 'poor'];
const DESTINATIONS = ['eaten_fresh', 'cooked', 'preserved', 'shared', 'sold', 'composted'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantInstanceId: string;
  plotId: string;
}

export function HarvestQuickLog({ open, onOpenChange, plantInstanceId, plotId }: Props) {
  const createHarvest = useCreateHarvest();
  const { toast } = useToast();

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      quantity: 1,
      unit: 'count',
      quality: 'good',
      destination: 'eaten_fresh',
      date_harvested: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      await createHarvest.mutateAsync({
        plant_instance_id: plantInstanceId,
        plot_id: plotId,
        date_harvested: data.date_harvested,
        quantity: Number(data.quantity),
        unit: data.unit as HarvestUnit,
        quality: data.quality as HarvestQuality,
        destination: data.destination as HarvestDestination,
        notes: data.notes || undefined,
      });
      toast({ title: 'Harvest logged!' });
      reset();
      onOpenChange(false);
    } catch {
      toast({ title: 'Failed to log harvest', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Harvest</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input type="number" step="0.1" {...register('quantity', { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select defaultValue="count" onValueChange={v => setValue('unit', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quality</Label>
            <div className="flex gap-2">
              {QUALITY.map(q => (
                <Button
                  key={q}
                  type="button"
                  size="sm"
                  variant={watch('quality') === q ? 'default' : 'outline'}
                  className="flex-1 capitalize min-h-[44px]"
                  onClick={() => setValue('quality', q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Destination</Label>
            <Select defaultValue="eaten_fresh" onValueChange={v => setValue('destination', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DESTINATIONS.map(d => (
                  <SelectItem key={d} value={d} className="capitalize">
                    {d.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" {...register('date_harvested')} />
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input {...register('notes')} placeholder="Any observations..." />
          </div>

          <Button type="submit" className="w-full" disabled={createHarvest.isPending}>
            {createHarvest.isPending ? 'Saving...' : 'Log Harvest'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
