import { useState } from 'react';
import { Sprout, Plus, AlertTriangle, Package, Trash2 } from 'lucide-react';
import { useSeedInventory, useCreateSeedInventory, useUpdateSeedInventory, useDeleteSeedInventory } from '@/hooks/use-seed-inventory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface SeedFormData {
  variety_name: string;
  brand: string;
  source: string;
  quantity_packets: number;
  quantity_seeds_approx: number | undefined;
  purchase_date: string;
  expiration_date: string;
  storage_location: string;
  cost_cents: number | undefined;
  notes: string;
}

const emptyForm: SeedFormData = {
  variety_name: '', brand: '', source: '', quantity_packets: 1,
  quantity_seeds_approx: undefined, purchase_date: '', expiration_date: '',
  storage_location: '', cost_cents: undefined, notes: '',
};

export function SeedInventoryPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SeedFormData>(emptyForm);
  const [filter, setFilter] = useState<'all' | 'expiring' | 'low'>('all');

  const { data, isLoading } = useSeedInventory(
    filter === 'expiring' ? { expiring_soon: true } : filter === 'low' ? { low_quantity: true } : undefined
  );
  const createSeed = useCreateSeedInventory();
  const updateSeed = useUpdateSeedInventory();
  const deleteSeed = useDeleteSeedInventory();
  const { toast } = useToast();

  const seeds = data?.data ?? [];

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (seed: any) => {
    setEditId(seed.id);
    setForm({
      variety_name: seed.variety_name ?? '',
      brand: seed.brand ?? '',
      source: seed.source ?? '',
      quantity_packets: seed.quantity_packets ?? 0,
      quantity_seeds_approx: seed.quantity_seeds_approx ?? undefined,
      purchase_date: seed.purchase_date ?? '',
      expiration_date: seed.expiration_date ?? '',
      storage_location: seed.storage_location ?? '',
      cost_cents: seed.cost_cents ?? undefined,
      notes: seed.notes ?? '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...form,
        quantity_packets: Number(form.quantity_packets),
        quantity_seeds_approx: form.quantity_seeds_approx ? Number(form.quantity_seeds_approx) : undefined,
        cost_cents: form.cost_cents ? Number(form.cost_cents) : undefined,
      };
      if (editId) {
        await updateSeed.mutateAsync({ id: editId, data: payload });
        toast({ title: 'Seed packet updated' });
      } else {
        await createSeed.mutateAsync(payload);
        toast({ title: 'Seed packet added' });
      }
      setDialogOpen(false);
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSeed.mutateAsync(id);
      toast({ title: 'Seed packet deleted' });
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const isExpiring = (date: string | null) => {
    if (!date) return false;
    const exp = new Date(date);
    const now = new Date();
    const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 90;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sprout className="w-5 h-5" />
          Seed Inventory
        </h2>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Seeds
        </Button>
      </div>

      <div className="flex gap-2">
        {(['all', 'expiring', 'low'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'expiring' ? 'Expiring Soon' : 'Low Stock'}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : seeds.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {filter === 'all' ? 'No seeds in inventory yet. Add your first packet!' : 'No seeds match this filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {seeds.map((seed: any) => (
            <Card key={seed.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openEdit(seed)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="truncate">{seed.variety_name}</span>
                  <div className="flex gap-1">
                    {seed.quantity_packets <= 1 && (
                      <Badge variant="destructive" className="text-xs">Low</Badge>
                    )}
                    {isExpiring(seed.expiration_date) && (
                      <Badge variant="secondary" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-0.5" />
                        Expiring
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {seed.brand && <p className="text-muted-foreground">{seed.brand}</p>}
                <p>Packets: <span className="font-medium">{seed.quantity_packets}</span></p>
                {seed.quantity_seeds_approx && <p>~{seed.quantity_seeds_approx} seeds</p>}
                {seed.expiration_date && <p className="text-xs text-muted-foreground">Expires: {seed.expiration_date}</p>}
                {seed.storage_location && <p className="text-xs text-muted-foreground">Stored: {seed.storage_location}</p>}
                {seed.cost_cents != null && <p className="text-xs text-muted-foreground">Cost: ${(seed.cost_cents / 100).toFixed(2)}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Seed Packet' : 'Add Seed Packet'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Variety Name *</Label>
              <Input value={form.variety_name} onChange={(e) => setForm({ ...form, variety_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Brand</Label>
                <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div>
                <Label>Source</Label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Packets</Label>
                <Input type="number" min={0} value={form.quantity_packets} onChange={(e) => setForm({ ...form, quantity_packets: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Seeds (approx)</Label>
                <Input type="number" min={0} value={form.quantity_seeds_approx ?? ''} onChange={(e) => setForm({ ...form, quantity_seeds_approx: e.target.value ? parseInt(e.target.value) : undefined })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Purchase Date</Label>
                <Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
              </div>
              <div>
                <Label>Expiration Date</Label>
                <Input type="date" value={form.expiration_date} onChange={(e) => setForm({ ...form, expiration_date: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Storage Location</Label>
                <Input value={form.storage_location} onChange={(e) => setForm({ ...form, storage_location: e.target.value })} />
              </div>
              <div>
                <Label>Cost (cents)</Label>
                <Input type="number" min={0} value={form.cost_cents ?? ''} onChange={(e) => setForm({ ...form, cost_cents: e.target.value ? parseInt(e.target.value) : undefined })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            {editId && (
              <Button variant="destructive" size="sm" onClick={() => { handleDelete(editId); setDialogOpen(false); }}>
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            )}
            <Button
              className="ml-auto"
              disabled={!form.variety_name || createSeed.isPending || updateSeed.isPending}
              onClick={handleSubmit}
            >
              {(createSeed.isPending || updateSeed.isPending) ? 'Saving...' : editId ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
