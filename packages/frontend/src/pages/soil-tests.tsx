import { useState } from 'react';
import { Plus, FlaskConical, TrendingUp, LayoutGrid, TableIcon } from 'lucide-react';
import { useSoilTests, useCreateSoilTest, useDeleteSoilTest } from '@/hooks/use-soil-tests';
import { usePlotsByGarden } from '@/hooks/use-plots';
import { useGardenContext } from '@/contexts/garden-context';
import { DataTable, type Column } from '@/components/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

function phColor(ph: number | null): string {
  if (ph === null) return 'text-muted-foreground';
  if (ph < 5.5) return 'text-red-500';
  if (ph < 6.0) return 'text-orange-500';
  if (ph <= 7.0) return 'text-green-500';
  if (ph <= 7.5) return 'text-orange-500';
  return 'text-red-500';
}

function nutrientLevel(ppm: number | null, low: number, high: number): string {
  if (ppm === null) return 'N/A';
  if (ppm < low) return 'Low';
  if (ppm <= high) return 'Optimal';
  return 'High';
}

function nutrientColor(ppm: number | null, low: number, high: number): string {
  if (ppm === null) return 'text-muted-foreground';
  if (ppm < low) return 'text-red-500';
  if (ppm <= high) return 'text-green-500';
  return 'text-orange-500';
}

const soilTestColumns: Column<any>[] = [
  { key: 'test_date', label: 'Date' },
  { key: 'ph', label: 'pH', render: (row) => row.ph !== null ? (
    <span className={`font-medium ${phColor(row.ph)}`}>{row.ph}</span>
  ) : '-' },
  { key: 'nitrogen_ppm', label: 'N (ppm)', render: (row) => row.nitrogen_ppm !== null ? (
    <span className={nutrientColor(row.nitrogen_ppm, 25, 50)}>
      {row.nitrogen_ppm} <Badge variant="outline" className={`ml-1 text-xs ${nutrientColor(row.nitrogen_ppm, 25, 50)}`}>{nutrientLevel(row.nitrogen_ppm, 25, 50)}</Badge>
    </span>
  ) : '-' },
  { key: 'phosphorus_ppm', label: 'P (ppm)', render: (row) => row.phosphorus_ppm !== null ? (
    <span className={nutrientColor(row.phosphorus_ppm, 15, 40)}>
      {row.phosphorus_ppm} <Badge variant="outline" className={`ml-1 text-xs ${nutrientColor(row.phosphorus_ppm, 15, 40)}`}>{nutrientLevel(row.phosphorus_ppm, 15, 40)}</Badge>
    </span>
  ) : '-' },
  { key: 'potassium_ppm', label: 'K (ppm)', render: (row) => row.potassium_ppm !== null ? (
    <span className={nutrientColor(row.potassium_ppm, 100, 200)}>
      {row.potassium_ppm} <Badge variant="outline" className={`ml-1 text-xs ${nutrientColor(row.potassium_ppm, 100, 200)}`}>{nutrientLevel(row.potassium_ppm, 100, 200)}</Badge>
    </span>
  ) : '-' },
  { key: 'organic_matter_pct', label: 'Organic %', render: (row) => row.organic_matter_pct !== null ? `${row.organic_matter_pct}%` : '-' },
  { key: 'moisture_level', label: 'Moisture', render: (row) => row.moisture_level ? (
    <span className="capitalize">{row.moisture_level.replace(/_/g, ' ')}</span>
  ) : '-' },
];

function CreateSoilTestDialog({ plots }: { plots: any[] }) {
  const [open, setOpen] = useState(false);
  const createSoilTest = useCreateSoilTest();
  const { toast } = useToast();

  const [form, setForm] = useState({
    plot_id: '',
    test_date: new Date().toISOString().split('T')[0],
    ph: '',
    nitrogen_ppm: '',
    phosphorus_ppm: '',
    potassium_ppm: '',
    organic_matter_pct: '',
    moisture_level: '',
    notes: '',
  });

  const handleCreate = () => {
    if (!form.plot_id) {
      toast({ title: 'Please select a plot', variant: 'destructive' });
      return;
    }
    createSoilTest.mutate(
      {
        plot_id: form.plot_id,
        test_date: form.test_date,
        ph: form.ph ? parseFloat(form.ph) : null,
        nitrogen_ppm: form.nitrogen_ppm ? parseFloat(form.nitrogen_ppm) : null,
        phosphorus_ppm: form.phosphorus_ppm ? parseFloat(form.phosphorus_ppm) : null,
        potassium_ppm: form.potassium_ppm ? parseFloat(form.potassium_ppm) : null,
        organic_matter_pct: form.organic_matter_pct ? parseFloat(form.organic_matter_pct) : null,
        moisture_level: form.moisture_level || null,
        notes: form.notes || null,
      },
      {
        onSuccess: () => {
          toast({ title: 'Soil test recorded' });
          setOpen(false);
        },
        onError: () => toast({ title: 'Failed to save soil test', variant: 'destructive' }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-1" />Log Soil Test</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Log Soil Test</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Plot *</Label>
            <Select value={form.plot_id} onValueChange={v => setForm({ ...form, plot_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select plot" /></SelectTrigger>
              <SelectContent>
                {plots.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Test Date</Label>
            <Input type="date" value={form.test_date} onChange={e => setForm({ ...form, test_date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>pH</Label><Input type="number" step="0.1" value={form.ph} onChange={e => setForm({ ...form, ph: e.target.value })} placeholder="6.5" /></div>
            <div><Label>Nitrogen (ppm)</Label><Input type="number" value={form.nitrogen_ppm} onChange={e => setForm({ ...form, nitrogen_ppm: e.target.value })} /></div>
            <div><Label>Phosphorus (ppm)</Label><Input type="number" value={form.phosphorus_ppm} onChange={e => setForm({ ...form, phosphorus_ppm: e.target.value })} /></div>
            <div><Label>Potassium (ppm)</Label><Input type="number" value={form.potassium_ppm} onChange={e => setForm({ ...form, potassium_ppm: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Organic Matter (%)</Label><Input type="number" step="0.1" value={form.organic_matter_pct} onChange={e => setForm({ ...form, organic_matter_pct: e.target.value })} /></div>
            <div>
              <Label>Moisture</Label>
              <Select value={form.moisture_level} onValueChange={v => setForm({ ...form, moisture_level: v })}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {['dry', 'slightly_moist', 'moist', 'wet', 'saturated'].map(m => (
                    <SelectItem key={m} value={m}>{m.replaceAll('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>
          <Button onClick={handleCreate} disabled={createSoilTest.isPending} className="w-full">
            {createSoilTest.isPending ? 'Saving...' : 'Save Soil Test'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SoilTestsPage() {
  const [view, setView] = useState<'card' | 'table'>(() =>
    (localStorage.getItem('soil-tests-view') as 'card' | 'table') ?? 'card'
  );
  const toggleView = (v: 'card' | 'table') => {
    setView(v);
    localStorage.setItem('soil-tests-view', v);
  };

  const { currentGardenId } = useGardenContext();
  const { data: plotsData } = usePlotsByGarden(currentGardenId);
  const plots = plotsData?.data ?? [];
  const [selectedPlot, setSelectedPlot] = useState<string | null>(null);
  const { data: testsData } = useSoilTests(selectedPlot);
  const deleteSoilTest = useDeleteSoilTest();
  const { toast } = useToast();

  const tests = testsData?.data ?? [];

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Soil Tests</h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button variant={view === 'card' ? 'default' : 'outline'} size="sm" onClick={() => toggleView('card')}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button variant={view === 'table' ? 'default' : 'outline'} size="sm" onClick={() => toggleView('table')}>
              <TableIcon className="w-4 h-4" />
            </Button>
          </div>
          <CreateSoilTestDialog plots={plots} />
        </div>
      </div>

      <div>
        <Label>Select Plot</Label>
        <Select value={selectedPlot || ''} onValueChange={v => setSelectedPlot(v)}>
          <SelectTrigger><SelectValue placeholder="Choose a plot to view tests" /></SelectTrigger>
          <SelectContent>
            {plots.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedPlot ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Select a plot to view soil test history</p>
          </CardContent>
        </Card>
      ) : tests.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No soil tests recorded for this plot</p>
          </CardContent>
        </Card>
      ) : view === 'table' ? (
        <DataTable data={tests} columns={soilTestColumns} exportFilename="soil-tests" />
      ) : (
        <div className="space-y-3">
          {tests.map((test: any) => (
            <Card key={test.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{test.test_date}</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => {
                    if (!confirm('Delete this soil test?')) return;
                    deleteSoilTest.mutate(test.id, { onSuccess: () => toast({ title: 'Deleted' }) });
                  }}>Delete</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  {test.ph !== null && (
                    <div>
                      <span className="text-muted-foreground">pH</span>
                      <p className={`font-medium ${phColor(test.ph)}`}>{test.ph}</p>
                    </div>
                  )}
                  {test.nitrogen_ppm !== null && (
                    <div>
                      <span className="text-muted-foreground">N</span>
                      <p className={`font-medium ${nutrientColor(test.nitrogen_ppm, 25, 50)}`}>
                        {test.nitrogen_ppm} ppm
                        <Badge variant="outline" className={`ml-1 text-xs ${nutrientColor(test.nitrogen_ppm, 25, 50)}`}>
                          {nutrientLevel(test.nitrogen_ppm, 25, 50)}
                        </Badge>
                      </p>
                    </div>
                  )}
                  {test.phosphorus_ppm !== null && (
                    <div>
                      <span className="text-muted-foreground">P</span>
                      <p className={`font-medium ${nutrientColor(test.phosphorus_ppm, 15, 40)}`}>
                        {test.phosphorus_ppm} ppm
                        <Badge variant="outline" className={`ml-1 text-xs ${nutrientColor(test.phosphorus_ppm, 15, 40)}`}>
                          {nutrientLevel(test.phosphorus_ppm, 15, 40)}
                        </Badge>
                      </p>
                    </div>
                  )}
                  {test.potassium_ppm !== null && (
                    <div>
                      <span className="text-muted-foreground">K</span>
                      <p className={`font-medium ${nutrientColor(test.potassium_ppm, 100, 200)}`}>
                        {test.potassium_ppm} ppm
                        <Badge variant="outline" className={`ml-1 text-xs ${nutrientColor(test.potassium_ppm, 100, 200)}`}>
                          {nutrientLevel(test.potassium_ppm, 100, 200)}
                        </Badge>
                      </p>
                    </div>
                  )}
                </div>
                {test.notes && <p className="text-sm text-muted-foreground mt-2">{test.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
