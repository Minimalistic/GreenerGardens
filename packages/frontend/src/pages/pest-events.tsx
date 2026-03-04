import { useState, useEffect } from 'react';
import { Plus, Bug, AlertTriangle, CheckCircle2, Clock, X, LayoutGrid, TableIcon } from 'lucide-react';
import { usePestEvents, useCreatePestEvent, useUpdatePestEvent, useDeletePestEvent } from '@/hooks/use-pest-events';
import { useGardenContext } from '@/contexts/garden-context';
import { usePlotsByGarden } from '@/hooks/use-plots';
import { DataTable, type Column } from '@/components/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import type { PestEvent, Plot } from '@gardenvault/shared';

const pestEventColumns: Column<PestEvent>[] = [
  { key: 'pest_name', label: 'Pest Name' },
  { key: 'pest_type', label: 'Type', render: (row) => (
    <span className="capitalize">{row.pest_type?.replace(/_/g, ' ') ?? '-'}</span>
  )},
  { key: 'severity', label: 'Severity', render: (row) => (
    <Badge variant="outline" className={severityColors[row.severity] ?? ''}>{row.severity}</Badge>
  )},
  { key: 'detected_date', label: 'Detected' },
  { key: 'treatment_applied', label: 'Treatment', render: (row) => row.treatment_applied || '-' },
  { key: 'outcome', label: 'Outcome', render: (row) => (
    <span className="capitalize">{row.outcome ?? '-'}</span>
  )},
];

const PEST_TYPES = ['insect', 'disease', 'fungal', 'bacterial', 'viral', 'animal', 'weed', 'nutrient_deficiency', 'other'];
const SEVERITIES = ['low', 'medium', 'high', 'critical'];

const severityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const outcomeIcons: Record<string, typeof Clock> = {
  ongoing: Clock,
  resolved: CheckCircle2,
  recurring: AlertTriangle,
  failed: AlertTriangle,
};

function useAffectedAreaOptions() {
  const { currentGardenId, garden } = useGardenContext();
  const { data: plotsData } = usePlotsByGarden(currentGardenId);
  const plots: Plot[] = plotsData?.data ?? [];
  return { currentGardenId, garden, plots };
}

function AffectedAreaSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { currentGardenId, garden, plots } = useAffectedAreaOptions();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder="Select garden or plot" /></SelectTrigger>
      <SelectContent>
        {currentGardenId && (
          <SelectItem value={`garden:${currentGardenId}`}>
            {garden?.name ?? 'Whole Garden'}
          </SelectItem>
        )}
        {plots.map((p) => (
          <SelectItem key={p.id} value={`plot:${p.id}`}>{p.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PestEventFormFields({
  form,
  setForm,
}: {
  form: { pest_name: string; pest_type: string; severity: string; detected_date: string; affected: string; treatment_applied: string; notes: string };
  setForm: (updater: (prev: typeof form) => typeof form) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label>Pest Name *</Label>
        <Input value={form.pest_name} onChange={e => setForm(f => ({ ...f, pest_name: e.target.value }))} placeholder="e.g., Aphids, Powdery Mildew" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Type</Label>
          <Select value={form.pest_type} onValueChange={v => setForm(f => ({ ...f, pest_type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PEST_TYPES.map(t => (
                <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Severity</Label>
          <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SEVERITIES.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Detected Date</Label>
        <Input type="date" value={form.detected_date} onChange={e => setForm(f => ({ ...f, detected_date: e.target.value }))} />
      </div>
      <div>
        <Label>Affected Area *</Label>
        <AffectedAreaSelect value={form.affected} onChange={v => setForm(f => ({ ...f, affected: v }))} />
      </div>
      <div>
        <Label>Treatment Applied</Label>
        <Input value={form.treatment_applied} onChange={e => setForm(f => ({ ...f, treatment_applied: e.target.value }))} placeholder="e.g., Neem oil spray" />
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional observations..." rows={3} />
      </div>
    </div>
  );
}

function CreatePestEventDialog() {
  const [open, setOpen] = useState(false);
  const createPestEvent = useCreatePestEvent();
  const { toast } = useToast();

  const [form, setForm] = useState({
    pest_name: '',
    pest_type: 'other',
    severity: 'medium',
    detected_date: new Date().toISOString().split('T')[0],
    affected: '',
    treatment_applied: '',
    notes: '',
  });

  const handleCreate = () => {
    if (!form.pest_name || !form.affected) {
      toast({ title: 'Please fill required fields', variant: 'destructive' });
      return;
    }
    const [entity_type, entity_id] = form.affected.split(':');
    createPestEvent.mutate(
      { entity_type, entity_id, pest_name: form.pest_name, pest_type: form.pest_type, severity: form.severity, detected_date: form.detected_date, treatment_applied: form.treatment_applied || undefined, notes: form.notes || undefined },
      {
        onSuccess: () => {
          toast({ title: 'Pest event reported' });
          setOpen(false);
          setForm(f => ({ ...f, pest_name: '', notes: '', treatment_applied: '', affected: '' }));
        },
        onError: () => toast({ title: 'Failed to report pest event', variant: 'destructive' }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-1" />Report Pest</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Report Pest Event</DialogTitle></DialogHeader>
        <PestEventFormFields form={form} setForm={setForm} />
        <Button onClick={handleCreate} disabled={createPestEvent.isPending} className="w-full">
          {createPestEvent.isPending ? 'Reporting...' : 'Report Pest Event'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function EditPestEventDialog({ event, open, onOpenChange }: { event: PestEvent; open: boolean; onOpenChange: (v: boolean) => void }) {
  const updatePestEvent = useUpdatePestEvent();
  const deletePestEvent = useDeletePestEvent();
  const { toast } = useToast();

  const [form, setForm] = useState({
    pest_name: '',
    pest_type: 'other',
    severity: 'medium',
    detected_date: '',
    affected: '',
    treatment_applied: '',
    notes: '',
  });

  useEffect(() => {
    if (event && open) {
      setForm({
        pest_name: event.pest_name ?? '',
        pest_type: event.pest_type ?? 'other',
        severity: event.severity ?? 'medium',
        detected_date: event.detected_date ?? '',
        affected: `${event.entity_type}:${event.entity_id}`,
        treatment_applied: event.treatment_applied ?? '',
        notes: event.notes ?? '',
      });
    }
  }, [event, open]);

  const handleSave = () => {
    if (!form.pest_name || !form.affected) {
      toast({ title: 'Please fill required fields', variant: 'destructive' });
      return;
    }
    const [entity_type, entity_id] = form.affected.split(':');
    updatePestEvent.mutate(
      { id: event.id, entity_type, entity_id, pest_name: form.pest_name, pest_type: form.pest_type, severity: form.severity, detected_date: form.detected_date, treatment_applied: form.treatment_applied || undefined, notes: form.notes || undefined },
      {
        onSuccess: () => {
          toast({ title: 'Pest event updated' });
          onOpenChange(false);
        },
        onError: () => toast({ title: 'Failed to update', variant: 'destructive' }),
      },
    );
  };

  const handleDelete = () => {
    if (!confirm('Delete this pest event?')) return;
    deletePestEvent.mutate(event.id, {
      onSuccess: () => {
        toast({ title: 'Pest event deleted' });
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Edit Pest Event</DialogTitle></DialogHeader>
        <PestEventFormFields form={form} setForm={setForm} />
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deletePestEvent.isPending}>
            Delete
          </Button>
          <Button className="flex-1" onClick={handleSave} disabled={updatePestEvent.isPending}>
            {updatePestEvent.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PestEventsPage() {
  const [view, setView] = useState<'card' | 'table'>(() =>
    (localStorage.getItem('pest-events-view') as 'card' | 'table') ?? 'card'
  );
  const toggleView = (v: 'card' | 'table') => {
    setView(v);
    localStorage.setItem('pest-events-view', v);
  };

  const [outcomeFilter, setOutcomeFilter] = useState<string | undefined>();
  const [pestTypeFilter, setPestTypeFilter] = useState<string | undefined>();
  const [severityFilter, setSeverityFilter] = useState<string | undefined>();
  const { data } = usePestEvents({ outcome: outcomeFilter, pest_type: pestTypeFilter, severity: severityFilter });
  const updatePestEvent = useUpdatePestEvent();
  const { toast } = useToast();

  const [editEvent, setEditEvent] = useState<PestEvent | null>(null);

  const events = data?.data ?? [];

  const handleResolve = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    updatePestEvent.mutate(
      { id, outcome: 'resolved', resolved_date: new Date().toISOString().split('T')[0] },
      {
        onSuccess: () => toast({ title: 'Pest event resolved' }),
        onError: () => toast({ title: 'Failed to update', variant: 'destructive' }),
      },
    );
  };

  const activeFilterCount = [pestTypeFilter, severityFilter].filter(Boolean).length;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pest & Disease Tracker</h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button variant={view === 'card' ? 'default' : 'outline'} size="sm" onClick={() => toggleView('card')}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button variant={view === 'table' ? 'default' : 'outline'} size="sm" onClick={() => toggleView('table')}>
              <TableIcon className="w-4 h-4" />
            </Button>
          </div>
          <CreatePestEventDialog />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'ongoing', 'resolved', 'recurring', 'failed'].map(f => (
          <Button
            key={f}
            variant={outcomeFilter === (f === 'all' ? undefined : f) ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOutcomeFilter(f === 'all' ? undefined : f)}
          >
            {f}
          </Button>
        ))}
        {(pestTypeFilter || severityFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setPestTypeFilter(undefined); setSeverityFilter(undefined); }}
          >
            <X className="w-3 h-3 mr-1" />
            Clear filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </Button>
        )}
      </div>

      {(pestTypeFilter || severityFilter) && (
        <div className="flex flex-wrap gap-1">
          {pestTypeFilter && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setPestTypeFilter(undefined)}>
              Type: {pestTypeFilter.replace('_', ' ')} <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
          {severityFilter && (
            <Badge variant="secondary" className="cursor-pointer" onClick={() => setSeverityFilter(undefined)}>
              Severity: {severityFilter} <X className="w-3 h-3 ml-1" />
            </Badge>
          )}
        </div>
      )}

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Bug className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No pest events recorded</p>
          </CardContent>
        </Card>
      ) : view === 'table' ? (
        <DataTable data={events} columns={pestEventColumns} exportFilename="pest-events" />
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const OutcomeIcon = outcomeIcons[event.outcome] || Clock;
            return (
              <Card
                key={event.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setEditEvent(event)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Bug className="w-5 h-5 mt-0.5 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{event.pest_name}</span>
                          <Badge
                            variant="outline"
                            className={`cursor-pointer hover:ring-1 hover:ring-ring ${severityColors[event.severity]}`}
                            onClick={(e) => { e.stopPropagation(); setSeverityFilter(severityFilter === event.severity ? undefined : event.severity); }}
                          >
                            {event.severity}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="capitalize cursor-pointer hover:ring-1 hover:ring-ring"
                            onClick={(e) => { e.stopPropagation(); setPestTypeFilter(pestTypeFilter === event.pest_type ? undefined : event.pest_type); }}
                          >
                            {event.pest_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Detected: {event.detected_date}</p>
                        {event.treatment_applied && <p className="text-sm mt-1">Treatment: {event.treatment_applied}</p>}
                        {event.notes && <p className="text-sm text-muted-foreground mt-1">{event.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <OutcomeIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm capitalize">{event.outcome}</span>
                      {event.outcome === 'ongoing' && (
                        <Button size="sm" variant="outline" onClick={(e) => handleResolve(e, event.id)}>Resolve</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editEvent && (
        <EditPestEventDialog
          event={editEvent}
          open={!!editEvent}
          onOpenChange={(v) => { if (!v) setEditEvent(null); }}
        />
      )}
    </div>
  );
}
