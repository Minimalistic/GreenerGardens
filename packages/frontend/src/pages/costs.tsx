import { useState } from 'react';
import { DollarSign, Plus, Receipt, Trash2, LayoutGrid, TableIcon } from 'lucide-react';
import { useCosts, useCostSummary, useCreateCost, useUpdateCost, useDeleteCost } from '@/hooks/use-costs';
import { DataTable, type Column } from '@/components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUndoRedo } from '@/contexts/undo-redo-context';
import type { CostEntry, CostCategory } from '@gardenvault/shared';

const CATEGORIES: CostCategory[] = [
  'seeds', 'soil', 'fertilizer', 'tools', 'infrastructure',
  'pest_control', 'water', 'labor', 'other',
];

const categoryLabel = (c: string) =>
  c === 'pest_control' ? 'Pest Control' : c.charAt(0).toUpperCase() + c.slice(1);

interface CostFormData {
  description: string;
  category: CostCategory;
  amount_dollars: string;
  purchase_date: string;
  vendor: string;
  notes: string;
}

const emptyForm: CostFormData = {
  description: '', category: 'other', amount_dollars: '',
  purchase_date: new Date().toISOString().slice(0, 10), vendor: '', notes: '',
};

const costColumns: Column<CostEntry>[] = [
  {
    key: 'purchase_date', label: 'Date',
    render: (row) => new Date(row.purchase_date + 'T12:00:00').toLocaleDateString(),
  },
  { key: 'description', label: 'Description' },
  {
    key: 'category', label: 'Category',
    render: (row) => <Badge variant="secondary">{categoryLabel(row.category)}</Badge>,
  },
  {
    key: 'amount_cents', label: 'Amount',
    render: (row) => `$${(row.amount_cents / 100).toFixed(2)}`,
    getValue: (row) => row.amount_cents,
  },
  { key: 'vendor', label: 'Vendor', render: (row) => row.vendor || '-' },
  { key: 'notes', label: 'Notes', render: (row) => row.notes ? (row.notes.length > 60 ? row.notes.slice(0, 60) + '…' : row.notes) : '-' },
];

export function CostsPage() {
  const [view, setView] = useState<'card' | 'table'>(() =>
    (localStorage.getItem('costs-view') as 'card' | 'table') ?? 'card'
  );
  const toggleView = (v: 'card' | 'table') => {
    setView(v);
    localStorage.setItem('costs-view', v);
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CostFormData>(emptyForm);
  const [filter, setFilter] = useState<'all' | CostCategory>('all');

  const { data, isLoading } = useCosts(filter !== 'all' ? { category: filter } : undefined);
  const { data: summaryData } = useCostSummary(new Date().getFullYear());
  const createCost = useCreateCost();
  const updateCost = useUpdateCost();
  const deleteCost = useDeleteCost();
  const { toast } = useToast();
  const { push: pushUndo } = useUndoRedo();

  const costs = (data?.data ?? []) as CostEntry[];
  const summary = summaryData?.data ?? [];

  // Compute summary stats
  const totalCents = costs.reduce((sum, c) => sum + c.amount_cents, 0);
  const entryCount = costs.length;
  const topCategory = summary.length > 0
    ? summary.reduce((a: any, b: any) => ((b.total ?? 0) > (a.total ?? 0) ? b : a))
    : null;

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (cost: CostEntry) => {
    setEditId(cost.id);
    setForm({
      description: cost.description,
      category: cost.category,
      amount_dollars: (cost.amount_cents / 100).toFixed(2),
      purchase_date: cost.purchase_date,
      vendor: cost.vendor ?? '',
      notes: cost.notes ?? '',
    });
    setDialogOpen(true);
  };

  const toPayload = (f: CostFormData) => ({
    description: f.description,
    category: f.category,
    amount_cents: Math.round(parseFloat(f.amount_dollars || '0') * 100),
    purchase_date: f.purchase_date,
    vendor: f.vendor || undefined,
    notes: f.notes || undefined,
  });

  const handleSubmit = async () => {
    try {
      const payload = toPayload(form);
      if (editId) {
        const oldCost = costs.find(c => c.id === editId);
        await updateCost.mutateAsync({ id: editId, data: payload });
        if (oldCost) {
          const oldPayload = toPayload({
            description: oldCost.description,
            category: oldCost.category,
            amount_dollars: (oldCost.amount_cents / 100).toFixed(2),
            purchase_date: oldCost.purchase_date,
            vendor: oldCost.vendor ?? '',
            notes: oldCost.notes ?? '',
          });
          pushUndo({
            label: `Update expense "${form.description}"`,
            undo: async () => { await updateCost.mutateAsync({ id: editId!, data: oldPayload }); },
            redo: async () => { await updateCost.mutateAsync({ id: editId!, data: payload }); },
          });
        }
        toast({ title: 'Expense updated' });
      } else {
        const result = await createCost.mutateAsync(payload);
        const newId = result?.data?.id;
        if (newId) {
          pushUndo({
            label: `Add expense "${form.description}"`,
            undo: async () => { await deleteCost.mutateAsync(newId); },
            redo: async () => { await createCost.mutateAsync(payload); },
          });
        }
        toast({ title: 'Expense added' });
      }
      setDialogOpen(false);
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    const cost = costs.find(c => c.id === id);
    try {
      await deleteCost.mutateAsync(id);
      if (cost) {
        pushUndo({
          label: `Delete expense "${cost.description}"`,
          undo: async () => {
            await createCost.mutateAsync(toPayload({
              description: cost.description,
              category: cost.category,
              amount_dollars: (cost.amount_cents / 100).toFixed(2),
              purchase_date: cost.purchase_date,
              vendor: cost.vendor ?? '',
              notes: cost.notes ?? '',
            }));
          },
          redo: async () => { await deleteCost.mutateAsync(id); },
        });
      }
      toast({ title: 'Expense deleted' });
    } catch {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Cost Tracker
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
            Add Expense
          </Button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>
        {CATEGORIES.map((cat) => (
          <Button key={cat} variant={filter === cat ? 'default' : 'outline'} size="sm" onClick={() => setFilter(cat)}>
            {categoryLabel(cat)}
          </Button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Total Spend ({new Date().getFullYear()})</p>
            <p className="text-2xl font-bold">${(totalCents / 100).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Top Category</p>
            <p className="text-2xl font-bold">{topCategory?.category ? categoryLabel(topCategory.category as string) : '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Entries</p>
            <p className="text-2xl font-bold">{entryCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : costs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {filter === 'all' ? 'No expenses recorded yet. Add your first one!' : 'No expenses match this filter.'}
            </p>
          </CardContent>
        </Card>
      ) : view === 'table' ? (
        <DataTable data={costs} columns={costColumns} exportFilename="cost-tracker" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {costs.map((cost) => (
            <Card key={cost.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => openEdit(cost)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="truncate">{cost.description}</span>
                  <Badge variant="secondary" className="text-xs shrink-0 ml-2">{categoryLabel(cost.category)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-lg font-semibold">${(cost.amount_cents / 100).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(cost.purchase_date + 'T12:00:00').toLocaleDateString()}
                </p>
                {cost.vendor && <p className="text-xs text-muted-foreground">Vendor: {cost.vendor}</p>}
                {cost.notes && <p className="text-xs text-muted-foreground truncate">{cost.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Description *</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as CostCategory })}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{categoryLabel(cat)}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Amount ($) *</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount_dollars}
                  onChange={(e) => setForm({ ...form, amount_dollars: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Purchase Date *</Label>
                <Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
              </div>
              <div>
                <Label>Vendor</Label>
                <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
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
              disabled={!form.description || !form.amount_dollars || !form.purchase_date || createCost.isPending || updateCost.isPending}
              onClick={handleSubmit}
            >
              {(createCost.isPending || updateCost.isPending) ? 'Saving...' : editId ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
