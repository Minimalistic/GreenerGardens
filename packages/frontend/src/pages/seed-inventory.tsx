import { useState } from 'react';
import { Sprout, Plus, AlertTriangle, Package, Trash2, LayoutGrid, TableIcon } from 'lucide-react';
import { useSeedInventory, useCreateSeedInventory, useUpdateSeedInventory, useDeleteSeedInventory } from '@/hooks/use-seed-inventory';
import { DataTable, type Column } from '@/components/data-table';
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

function isExpiringSeed(date: string | null) {
  if (!date) return false;
  const exp = new Date(date);
  const now = new Date();
  const diff = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 90;
}

const seedColumns: Column<any>[] = [
  { key: 'variety_name', label: 'Variety' },
  { key: 'brand', label: 'Brand', render: (row) => row.brand || '-' },
  { key: 'quantity_packets', label: 'Packets', render: (row) => (
    <span>
      {row.quantity_packets}
      {row.quantity_packets <= 1 && <Badge variant="destructive" className="ml-1 text-xs">Low</Badge>}
    </span>
  )},
  { key: 'quantity_seeds_approx', label: 'Seeds (approx)', render: (row) => row.quantity_seeds_approx || '-' },
  { key: 'expiration_date', label: 'Expires', render: (row) => row.expiration_date ? (
    <span>
      {row.expiration_date}
      {isExpiringSeed(row.expiration_date) && <Badge variant="secondary" className="ml-1 text-xs">Expiring</Badge>}
    </span>
  ) : '-' },
  { key: 'storage_location', label: 'Storage', render: (row) => row.storage_location || '-' },
  { key: 'cost_cents', label: 'Cost', render: (row) => row.cost_cents != null ? `$${(row.cost_cents / 100).toFixed(2)}` : '-',
    getValue: (row) => row.cost_cents ?? 0 },
];

export function SeedInventoryPage() {
  const [view, setView] = useState<'card' | 'table'>(() =>
    (localStorage.getItem('seeds-view') as 'card' | 'table') ?? 'card'
  );
  const toggleView = (v: 'card' | 'table') => {
    setView(v);
    localStorage.setItem('seeds-view', v);
  };

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
    if (!confirm('Delete this seed packet?')) return;
    try {
      await deleteSeed.mutateAsync(id);
      toast({ title: 'Seed packet deleted' });
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sprout className="w-5 h-5" />
          Seed Inventory
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button variant={view === 'card' ? 'default' : 'outline'} size="sm" onClick={() => toggleView('card')}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button variant={view === 'table' ? 'default' : 'outline'} size="sm" onClick={() => toggleView('table')}>
              <TableIcon className="w-4 h-4" />
            </Button>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Add Seeds
          </Button>
        </div>
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
      ) : view === 'table' ? (
        <DataTable data={seeds} columns={seedColumns} exportFilename="seed-inventory" />
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
                    {isExpiringSeed(seed.expiration_date) && (
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
