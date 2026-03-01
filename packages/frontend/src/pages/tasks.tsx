import { useState } from 'react';
import { Plus, CheckCircle2, Clock, SkipForward, Calendar, AlertTriangle } from 'lucide-react';
import { useOverdueTasks, useTodayTasks, useWeekTasks, useTasks, useCreateTask, useCompleteTask, useSkipTask, useUpdateTask } from '@/hooks/use-tasks';
import type { Task, TaskCreate } from '@/hooks/use-tasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.medium}`}>
      {priority}
    </span>
  );
}

function TaskCard({ task, onComplete, onSkip, onReschedule }: {
  task: Task;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  onReschedule: (id: string) => void;
}) {
  const isOverdue = task.due_date && task.due_date < new Date().toISOString().split('T')[0] && task.status !== 'completed' && task.status !== 'skipped';

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${isOverdue ? 'border-destructive/30 bg-destructive/5' : 'bg-card'}`}>
      <button
        onClick={() => onComplete(task.id)}
        className="mt-0.5 text-muted-foreground hover:text-primary transition-colors"
      >
        <CheckCircle2 className="w-5 h-5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{task.title}</span>
          <PriorityBadge priority={task.priority} />
          {task.auto_generated && (
            <span className="text-xs text-muted-foreground italic">auto</span>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
        )}
        {task.due_date && (
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {new Date(task.due_date + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
          </div>
        )}
        {isOverdue && (
          <div className="mt-2 text-xs text-destructive">
            You planned to do this. Ready to log it, or want to reschedule?
            <div className="flex gap-2 mt-1">
              <button onClick={() => onComplete(task.id)} className="underline hover:no-underline">Done</button>
              <button onClick={() => onReschedule(task.id)} className="underline hover:no-underline">Reschedule</button>
              <button onClick={() => onSkip(task.id)} className="underline hover:no-underline">Skip</button>
            </div>
          </div>
        )}
      </div>
      {!isOverdue && (
        <div className="flex gap-1">
          <button onClick={() => onSkip(task.id)} className="text-muted-foreground hover:text-foreground" title="Skip">
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function CreateTaskDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [taskType, setTaskType] = useState('other');
  const createTask = useCreateTask();
  const { toast } = useToast();

  const handleCreate = () => {
    if (!title.trim()) return;

    const data: TaskCreate = {
      title: title.trim(),
      priority,
      task_type: taskType,
    };
    if (description.trim()) data.description = description.trim();
    if (dueDate) data.due_date = dueDate;

    createTask.mutate(data, {
      onSuccess: () => {
        toast({ title: 'Task created' });
        setTitle('');
        setDescription('');
        setDueDate('');
        setPriority('medium');
        setTaskType('other');
        setOpen(false);
      },
      onError: () => {
        toast({ title: 'Failed to create task', variant: 'destructive' });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
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

function TaskSection({ title, icon: Icon, tasks, variant, onComplete, onSkip, onReschedule }: {
  title: string;
  icon: React.ElementType;
  tasks: Task[];
  variant?: 'destructive';
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  onReschedule: (id: string) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <Card className={variant === 'destructive' ? 'border-destructive/30' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm flex items-center gap-2 ${variant === 'destructive' ? 'text-destructive' : ''}`}>
          <Icon className="w-4 h-4" />
          {title}
          <span className="text-muted-foreground font-normal">({tasks.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onComplete={onComplete} onSkip={onSkip} onReschedule={onReschedule} />
        ))}
      </CardContent>
    </Card>
  );
}

export function TasksPage() {
  const { data: overdueData, isLoading: overdueLoading } = useOverdueTasks();
  const { data: todayData, isLoading: todayLoading } = useTodayTasks();
  const { data: weekData } = useWeekTasks();
  const { data: allData } = useTasks();
  const isLoading = overdueLoading || todayLoading;
  const completeTask = useCompleteTask();
  const skipTask = useSkipTask();
  const updateTask = useUpdateTask();
  const { toast } = useToast();

  const overdue = overdueData?.data ?? [];
  const today = todayData?.data ?? [];
  const week = weekData?.data ?? [];

  // "Later" = all pending tasks not in overdue/today/week
  const todayStr = new Date().toISOString().split('T')[0];
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = weekEnd.toISOString().split('T')[0];

  const allTasks = allData?.data ?? [];
  const later = allTasks.filter(t =>
    t.status !== 'completed' && t.status !== 'skipped' && t.status !== 'cancelled' &&
    (!t.due_date || t.due_date > weekEndStr)
  );

  const handleComplete = (id: string) => {
    completeTask.mutate(id, {
      onSuccess: () => toast({ title: 'Task completed' }),
    });
  };

  const handleSkip = (id: string) => {
    skipTask.mutate(id, {
      onSuccess: () => toast({ title: 'Task skipped' }),
    });
  };

  const handleReschedule = (id: string) => {
    // Reschedule to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    updateTask.mutate({ id, data: { due_date: tomorrowStr } }, {
      onSuccess: () => toast({ title: 'Rescheduled to tomorrow' }),
    });
  };

  const isEmpty = overdue.length === 0 && today.length === 0 && week.length === 0 && later.length === 0;

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Tasks</h2>
          <Skeleton className="h-9 w-24" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tasks</h2>
        <CreateTaskDialog />
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No tasks yet. Create one to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <TaskSection title="Overdue" icon={AlertTriangle} tasks={overdue} variant="destructive" onComplete={handleComplete} onSkip={handleSkip} onReschedule={handleReschedule} />
          <TaskSection title="Today" icon={Clock} tasks={today} onComplete={handleComplete} onSkip={handleSkip} onReschedule={handleReschedule} />
          <TaskSection title="This Week" icon={Calendar} tasks={week} onComplete={handleComplete} onSkip={handleSkip} onReschedule={handleReschedule} />
          <TaskSection title="Later" icon={Clock} tasks={later} onComplete={handleComplete} onSkip={handleSkip} onReschedule={handleReschedule} />
        </>
      )}
    </div>
  );
}
