import { useState } from 'react';
import { useCreateTask } from '@/hooks/use-tasks';
import type { TaskCreate } from '@/hooks/use-tasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType?: string;
  entityId?: string;
  entityName?: string;
}

export function CreateTaskDialog({ open, onOpenChange, entityType, entityId, entityName }: CreateTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [taskType, setTaskType] = useState('other');
  const createTask = useCreateTask();
  const { toast } = useToast();

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setPriority('medium');
    setTaskType('other');
  };

  const handleCreate = () => {
    if (!title.trim()) return;

    const data: TaskCreate = {
      title: title.trim(),
      priority,
      task_type: taskType,
    };
    if (description.trim()) data.description = description.trim();
    if (dueDate) data.due_date = dueDate;
    if (entityType && entityId) {
      data.entity_type = entityType;
      data.entity_id = entityId;
    }

    createTask.mutate(data, {
      onSuccess: () => {
        toast({ title: 'Task created' });
        resetForm();
        onOpenChange(false);
      },
      onError: () => {
        toast({ title: 'Failed to create task', variant: 'destructive' });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {entityName && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Linked to:</span>
              <span className="bg-muted px-2 py-0.5 rounded text-xs font-medium">{entityName}</span>
            </div>
          )}
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" />
          </div>
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Additional details..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input id="due_date" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={taskType} onValueChange={setTaskType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="watering">Watering</SelectItem>
                <SelectItem value="fertilizing">Fertilizing</SelectItem>
                <SelectItem value="pruning">Pruning</SelectItem>
                <SelectItem value="harvesting">Harvesting</SelectItem>
                <SelectItem value="planting">Planting</SelectItem>
                <SelectItem value="transplanting">Transplanting</SelectItem>
                <SelectItem value="pest_control">Pest Control</SelectItem>
                <SelectItem value="weeding">Weeding</SelectItem>
                <SelectItem value="soil_prep">Soil Prep</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} disabled={!title.trim() || createTask.isPending} className="w-full">
            {createTask.isPending ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
