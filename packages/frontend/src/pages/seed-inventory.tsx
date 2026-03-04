import { useState } from 'react';
import { Sprout, Plus, AlertTriangle, Package, Trash2, X } from 'lucide-react';
import { ViewToggleButtons } from '@/components/ui/view-toggle-buttons';
import { useViewToggle } from '@/hooks/use-view-toggle';
import { useSeedInventory, useCreateSeedInventory, useUpdateSeedInventory, useDeleteSeedInventory } from '@/hooks/use-seed-inventory';
import { usePlantCatalogSearch } from '@/hooks/use-plant-catalog';
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
  plant_catalog_id: string | undefined;
  variety_name: string;
  brand: string;
  source: string;
  quantity_packets: number;
  quantity_seeds_approx: number | undefined;
  purchase_date: string;
  expiration_date: string;
  lot_number: string;
  germination_rate_tested: number | undefined;
  storage_location: string;
  cost_cents: number | undefined;
  notes: string;
}

const emptyForm: SeedFormData = {
  plant_catalog_id: undefined, variety_name: '', brand: '', source: '', quantity_packets: 1,
  quantity_seeds_approx: undefined, purchase_date: '', expiration_date: '',
  lot_number: '', germination_rate_tested: undefined,
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
  { key: 'variety_name', label: 'Variety', render: (row) => (
    <span className="flex items-center gap-1.5">
      {row.plant_emoji && <span>{row.plant_emoji}</span>}
      <span>{row.variety_name}</span>
      {row.plant_name && row.plant_name !== row.variety_name && (
        <span className="text-muted-foreground text-xs">({row.plant_name})</span>
      )}
    </span>
  )},
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
  const [view, toggleView] = useViewToggle<'card' | 'table'>('seeds-view', 'card');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<SeedFormData>(emptyForm);
  const [filter, setFilter] = useState<'all' | 'expiring' | 'low'>('all');

  // Plant catalog search for the form
  const [plantSearch, setPlantSearch] = useState('');
  const [plantSearchOpen, setPlantSearchOpen] = useState(false);
  const [selectedPlantLabel, setSelectedPlantLabel] = useState('');
  const { data: catalogData } = usePlantCatalogSearch({ search: plantSearch, limit: 10 });
  const catalogResults = catalogData?.data ?? [];

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
    setPlantSearch('');
    setSelectedPlantLabel('');
    setPlantSearchOpen(false);
    setDialogOpen(true);
  };

  const openEdit = (seed: any) => {
    setEditId(seed.id);
    setForm({
      plant_catalog_id: seed.plant_catalog_id ?? undefined,
      variety_name: seed.variety_name ?? '',
      brand: seed.brand ?? '',
      source: seed.source ?? '',
      quantity_packets: seed.quantity_packets ?? 0,
      quantity_seeds_approx: seed.quantity_seeds_approx ?? undefined,
      purchase_date: seed.purchase_date ?? '',
      expiration_date: seed.expiration_date ?? '',
      lot_number: seed.lot_number ?? '',
      germination_rate_tested: seed.germination_rate_tested ?? undefined,
      storage_location: seed.storage_location ?? '',
      cost_cents: seed.cost_cents ?? undefined,
      notes: seed.notes ?? '',
    });
    setSelectedPlantLabel(
      seed.plant_catalog_id
        ? `${seed.plant_emoji ? seed.plant_emoji + ' ' : ''}${seed.plant_name || 'Linked plant'}`
        : ''
    );
    setPlantSearch('');
    setPlantSearchOpen(false);
    setDialogOpen(true);
  };

  const handleSelectPlant = (plant: any) => {
    setForm({ ...form, plant_catalog_id: plant.id });
    setSelectedPlantLabel(`${plant.emoji ? plant.emoji + ' ' : ''}${plant.common_name}`);
    setPlantSearch('');
    setPlantSearchOpen(false);
  };

  const handleClearPlant = () => {
    setForm({ ...form, plant_catalog_id: undefined });
    setSelectedPlantLabel('');
    setPlantSearch('');
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...form,
        quantity_packets: Number(form.quantity_packets),
        quantity_seeds_approx: form.quantity_seeds_approx ? Number(form.quantity_seeds_approx) : undefined,
        cost_cents: form.cost_cents ? Number(form.cost_cents) : undefined,
        germination_rate_tested: form.germination_rate_tested != null ? Number(form.germination_rate_tested) : undefined,
        lot_number: form.lot_number || undefined,
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
          <ViewToggleButtons view={view} onToggle={toggleView} primaryView="card" tableView="table" />
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
                  <span className="truncate flex items-center gap-1.5">
                    {seed.plant_emoji && <span>{seed.plant_emoji}</span>}
                    {seed.variety_name}
                  </span>
                  <div className="flex gap-1 shrink-0">
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
                {seed.plant_name && (
                  <p className="text-xs text-muted-foreground">{seed.plant_name}</p>
                )}
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Seed Packet' : 'Add Seed Packet'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Plant Catalog Link */}
            <div>
              <Label>Plant (from catalog)</Label>
              {form.plant_catalog_id && selectedPlantLabel ? (
                <div className="flex items-center gap-2 mt-1 px-3 py-2 border rounded-md bg-muted/50">
                  <span className="text-sm flex-1">{selectedPlantLabel}</span>
                  <button
                    type="button"
                    onClick={handleClearPlant}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder="Search plant catalog..."
                    value={plantSearch}
                    onChange={(e) => {
                      setPlantSearch(e.target.value);
                      setPlantSearchOpen(e.target.value.length > 0);
                    }}
                    onFocus={() => plantSearch && setPlantSearchOpen(true)}
                  />
                  {plantSearchOpen && catalogResults.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-md max-h-40 overflow-y-auto">
                      {catalogResults.map((plant: any) => (
                        <button
                          key={plant.id}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                          onClick={() => handleSelectPlant(plant)}
                        >
                          {plant.emoji && <span>{plant.emoji}</span>}
                          <span>{plant.common_name}</span>
                          {plant.scientific_name && (
                            <span className="text-xs text-muted-foreground italic">{plant.scientific_name}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">Link to a plant for cross-referencing</p>
            </div>

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
                <Label>Lot Number</Label>
                <Input value={form.lot_number} onChange={(e) => setForm({ ...form, lot_number: e.target.value })} />
              </div>
              <div>
                <Label>Germination Rate (%)</Label>
                <Input type="number" min={0} max={100} value={form.germination_rate_tested ?? ''} onChange={(e) => setForm({ ...form, germination_rate_tested: e.target.value ? parseFloat(e.target.value) : undefined })} />
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
