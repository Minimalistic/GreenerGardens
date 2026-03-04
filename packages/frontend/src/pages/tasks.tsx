import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle2, Clock, SkipForward, Calendar, AlertTriangle, LayoutGrid, TableIcon, ExternalLink } from 'lucide-react';
import { useOverdueTasks, useTodayTasks, useWeekTasks, useTasks, useCompleteTask, useSkipTask, useUpdateTask } from '@/hooks/use-tasks';
import type { Task } from '@/hooks/use-tasks';
import { useUpdatePlantInstance } from '@/hooks/use-plant-instances';
import { DataTable, type Column } from '@/components/data-table';
import { CreateTaskDialog } from '@/components/garden/create-task-dialog';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryError } from '@/components/query-error';

function getEntityRoute(task: Task): string | null {
  if (!task.entity_type || !task.entity_id) return null;
  switch (task.entity_type) {
    case 'plant_instance': return `/plants/${task.entity_id}`;
    case 'plot': return `/garden/plots/${task.entity_id}`;
    case 'garden': return `/garden`;
    default: return null;
  }
}

function getEntityLabel(task: Task): string | null {
  if (!task.entity_type || !task.entity_id) return null;
  const name = task.entity_name;
  switch (task.entity_type) {
    case 'plant_instance': return name ?? 'Plant';
    case 'plot': return name ?? 'Plot';
    case 'garden': return name ?? 'Garden';
    default: return null;
  }
}

function SourceLink({ task }: { task: Task }) {
  const navigate = useNavigate();
  const route = getEntityRoute(task);
  const label = getEntityLabel(task);
  if (!label || !route) return null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigate(route); }}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
    >
      <ExternalLink className="w-3 h-3" />
      {label}
    </button>
  );
}

function TaskTitleLink({ task }: { task: Task }) {
  const navigate = useNavigate();
  const route = getEntityRoute(task);
  return (
    <span
      className={route ? 'cursor-pointer hover:underline text-primary' : ''}
      onClick={route ? () => navigate(route) : undefined}
    >
      {task.title}
    </span>
  );
}

const taskColumns: Column<Task>[] = [
  { key: 'title', label: 'Title', render: (row) => <TaskTitleLink task={row} /> },
  { key: 'task_type', label: 'Type', render: (row) => (
    <span className="capitalize">{row.task_type.replace(/_/g, ' ')}</span>
  )},
  { key: 'priority', label: 'Priority', render: (row) => <PriorityBadge priority={row.priority} /> },
  { key: 'status', label: 'Status', render: (row) => (
    <span className="capitalize">{row.status}</span>
  )},
  { key: 'due_date', label: 'Due Date', render: (row) => row.due_date
    ? new Date(row.due_date + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
    : '-'
  },
  { key: 'entity_name', label: 'Source', render: (row) => {
    const label = getEntityLabel(row);
    const route = getEntityRoute(row);
    if (!label) return row.auto_generated ? 'Auto' : '';
    return route ? (
      <SourceLink task={row} />
    ) : (
      <span className="text-xs text-muted-foreground">{label}</span>
    );
  }},
];

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
  const navigate = useNavigate();
  const route = getEntityRoute(task);
  const isOverdue = task.due_date && task.due_date < new Date().toISOString().split('T')[0] && task.status !== 'completed' && task.status !== 'skipped';

  const handleCardClick = () => {
    if (route) navigate(route);
  };

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border ${isOverdue ? 'border-destructive/30 bg-destructive/5' : 'bg-card'} ${route ? 'cursor-pointer hover:border-primary/40 transition-colors' : ''}`}
      onClick={handleCardClick}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onComplete(task.id); }}
        className="mt-0.5 text-muted-foreground hover:text-primary transition-colors"
      >
        <CheckCircle2 className="w-5 h-5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium text-sm truncate ${route ? 'text-primary' : ''}`}>
            {task.title}
          </span>
          <PriorityBadge priority={task.priority} />
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1">
          {task.due_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              {new Date(task.due_date + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            </div>
          )}
          <SourceLink task={task} />
        </div>
        {isOverdue && (
          <div className="mt-2 text-xs text-destructive">
            You planned to do this. Ready to log it, or want to reschedule?
            <div className="flex gap-2 mt-1">
              <button onClick={(e) => { e.stopPropagation(); onComplete(task.id); }} className="underline hover:no-underline">Done</button>
              <button onClick={(e) => { e.stopPropagation(); onReschedule(task.id); }} className="underline hover:no-underline">Reschedule</button>
              <button onClick={(e) => { e.stopPropagation(); onSkip(task.id); }} className="underline hover:no-underline">Skip</button>
            </div>
          </div>
        )}
      </div>
      {!isOverdue && (
        <div className="flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); onSkip(task.id); }} className="text-muted-foreground hover:text-foreground" title="Skip">
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function RescheduleDialog({ task, open, onOpenChange }: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, setDate] = useState(tomorrow.toISOString().split('T')[0]);
  const updateTask = useUpdateTask();
  const updatePlantInstance = useUpdatePlantInstance();
  const { toast } = useToast();

  const handleConfirm = () => {
    if (!task || !date) return;
    updateTask.mutate({ id: task.id, data: { due_date: date } }, {
      onSuccess: () => {
        // If it's a harvest task linked to a plant instance, sync the expected harvest date
        if (task.task_type === 'harvesting' && task.entity_type === 'plant_instance' && task.entity_id) {
          updatePlantInstance.mutate({ id: task.entity_id, data: { expected_harvest_date: date } });
        }
        toast({ title: `Rescheduled to ${new Date(date + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}` });
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Reschedule Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="reschedule-date">New date</Label>
            <Input id="reschedule-date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <Button onClick={handleConfirm} disabled={!date || updateTask.isPending} className="w-full">
            {updateTask.isPending ? 'Saving...' : 'Reschedule'}
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
  const [view, setView] = useState<'card' | 'table'>(() =>
    (localStorage.getItem('tasks-view') as 'card' | 'table') ?? 'card'
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [rescheduleTask, setRescheduleTask] = useState<Task | null>(null);
  const toggleView = (v: 'card' | 'table') => {
    setView(v);
    localStorage.setItem('tasks-view', v);
  };

  const overdueQuery = useOverdueTasks();
  const todayQuery = useTodayTasks();
  const { data: weekData } = useWeekTasks();
  const { data: allData } = useTasks();
  const { data: overdueData } = overdueQuery;
  const { data: todayData } = todayQuery;
  const isLoading = overdueQuery.isLoading || todayQuery.isLoading;
  const queryError = overdueQuery.error || todayQuery.error;
  const completeTask = useCompleteTask();
  const skipTask = useSkipTask();
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
    const task = allTasks.find(t => t.id === id) ?? overdue.find(t => t.id === id) ?? today.find(t => t.id === id) ?? week.find(t => t.id === id);
    if (task) setRescheduleTask(task);
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
      {queryError && (
        <QueryError error={queryError} onRetry={() => { overdueQuery.refetch(); todayQuery.refetch(); }} />
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tasks</h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button variant={view === 'card' ? 'default' : 'outline'} size="sm" onClick={() => toggleView('card')}>
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button variant={view === 'table' ? 'default' : 'outline'} size="sm" onClick={() => toggleView('table')}>
              <TableIcon className="w-4 h-4" />
            </Button>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            New Task
          </Button>
        </div>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No tasks yet. Create one to get started!</p>
          </CardContent>
        </Card>
      ) : view === 'table' ? (
        <DataTable data={allTasks} columns={taskColumns} exportFilename="tasks" />
      ) : (
        <>
          <TaskSection title="Overdue" icon={AlertTriangle} tasks={overdue} variant="destructive" onComplete={handleComplete} onSkip={handleSkip} onReschedule={handleReschedule} />
          <TaskSection title="Today" icon={Clock} tasks={today} onComplete={handleComplete} onSkip={handleSkip} onReschedule={handleReschedule} />
          <TaskSection title="This Week" icon={Calendar} tasks={week} onComplete={handleComplete} onSkip={handleSkip} onReschedule={handleReschedule} />
          <TaskSection title="Later" icon={Clock} tasks={later} onComplete={handleComplete} onSkip={handleSkip} onReschedule={handleReschedule} />
        </>
      )}

      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} />

      <RescheduleDialog
        task={rescheduleTask}
        open={!!rescheduleTask}
        onOpenChange={(open) => { if (!open) setRescheduleTask(null); }}
      />
    </div>
  );
}
