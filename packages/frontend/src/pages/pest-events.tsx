import { useState } from 'react';
import { Plus, Bug, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { usePestEvents, useCreatePestEvent, useUpdatePestEvent, useDeletePestEvent } from '@/hooks/use-pest-events';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

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

function CreatePestEventDialog() {
  const [open, setOpen] = useState(false);
  const createPestEvent = useCreatePestEvent();
  const { toast } = useToast();

  const [form, setForm] = useState({
    pest_name: '',
    pest_type: 'other',
    severity: 'medium',
    detected_date: new Date().toISOString().split('T')[0],
    entity_type: 'plot',
    entity_id: '',
    treatment_applied: '',
    treatment_type: 'none',
    notes: '',
  });

  const handleCreate = () => {
    if (!form.pest_name || !form.entity_id) {
      toast({ title: 'Please fill required fields', variant: 'destructive' });
      return;
    }
    createPestEvent.mutate(form, {
      onSuccess: () => {
        toast({ title: 'Pest event reported' });
        setOpen(false);
        setForm({ ...form, pest_name: '', notes: '', treatment_applied: '', entity_id: '' });
      },
      onError: () => toast({ title: 'Failed to report pest event', variant: 'destructive' }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-1" />Report Pest</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Report Pest Event</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Pest Name *</Label>
            <Input value={form.pest_name} onChange={e => setForm({ ...form, pest_name: e.target.value })} placeholder="e.g., Aphids, Powdery Mildew" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Type</Label>
              <Select value={form.pest_type} onValueChange={v => setForm({ ...form, pest_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['insect', 'disease', 'fungal', 'bacterial', 'viral', 'animal', 'weed', 'nutrient_deficiency', 'other'].map(t => (
                    <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['low', 'medium', 'high', 'critical'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Detected Date</Label>
            <Input type="date" value={form.detected_date} onChange={e => setForm({ ...form, detected_date: e.target.value })} />
          </div>
          <div>
            <Label>Entity ID (plot or plant instance) *</Label>
            <Input value={form.entity_id} onChange={e => setForm({ ...form, entity_id: e.target.value })} placeholder="UUID of affected plot or plant" />
          </div>
          <div>
            <Label>Treatment Applied</Label>
            <Input value={form.treatment_applied} onChange={e => setForm({ ...form, treatment_applied: e.target.value })} placeholder="e.g., Neem oil spray" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional observations..." rows={3} />
          </div>
          <Button onClick={handleCreate} disabled={createPestEvent.isPending} className="w-full">
            {createPestEvent.isPending ? 'Reporting...' : 'Report Pest Event'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PestEventsPage() {
  const [outcomeFilter, setOutcomeFilter] = useState<string | undefined>();
  const { data } = usePestEvents({ outcome: outcomeFilter });
  const updatePestEvent = useUpdatePestEvent();
  const deletePestEvent = useDeletePestEvent();
  const { toast } = useToast();

  const events = data?.data ?? [];

  const handleResolve = (id: string) => {
    updatePestEvent.mutate(
      { id, outcome: 'resolved', resolved_date: new Date().toISOString().split('T')[0] },
      {
        onSuccess: () => toast({ title: 'Pest event resolved' }),
        onError: () => toast({ title: 'Failed to update', variant: 'destructive' }),
      },
    );
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pest & Disease Tracker</h2>
        <CreatePestEventDialog />
      </div>

      <div className="flex gap-2">
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
      </div>

      {events.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Bug className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No pest events recorded</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.map((event: any) => {
            const OutcomeIcon = outcomeIcons[event.outcome] || Clock;
            return (
              <Card key={event.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Bug className="w-5 h-5 mt-0.5 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{event.pest_name}</span>
                          <Badge variant="outline" className={severityColors[event.severity]}>{event.severity}</Badge>
                          <Badge variant="outline" className="capitalize">{event.pest_type.replace('_', ' ')}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Detected: {event.detected_date}</p>
                        {event.treatment_applied && <p className="text-sm mt-1">Treatment: {event.treatment_applied}</p>}
                        {event.notes && <p className="text-sm text-muted-foreground mt-1">{event.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <OutcomeIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm capitalize">{event.outcome}</span>
                      {event.outcome === 'ongoing' && (
                        <Button size="sm" variant="outline" onClick={() => handleResolve(event.id)}>Resolve</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => {
                        deletePestEvent.mutate(event.id, {
                          onSuccess: () => toast({ title: 'Deleted' }),
                        });
                      }}>Delete</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
