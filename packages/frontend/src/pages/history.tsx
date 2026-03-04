import { useState } from 'react';
import { useFilteredHistory, type HistoryFilters } from '@/hooks/use-history';
import { DataTable, type Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  History, LayoutGrid, TableIcon, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Flower2, Map, Grid3X3, Sprout, Scissors, CheckSquare, StickyNote,
  Bug, DollarSign, FlaskConical, type LucideIcon,
} from 'lucide-react';
import type { HistoryLog } from '@gardenvault/shared';
import { cn } from '@/lib/utils';
import { useViewToggle } from '@/hooks/use-view-toggle';
import { formatDateTime } from '@/lib/format-date';

const ENTITY_TYPES = [
  'garden', 'plot', 'sub_plot', 'plant_instance', 'harvest',
  'task', 'note', 'pest_event', 'seed_inventory', 'cost_entry', 'soil_test',
] as const;

const ACTIONS = ['create', 'update', 'delete'] as const;

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const ACTION_BORDER: Record<string, string> = {
  create: 'border-green-500',
  update: 'border-blue-500',
  delete: 'border-red-500',
};

const ACTION_DOT: Record<string, string> = {
  create: 'bg-green-500',
  update: 'bg-blue-500',
  delete: 'bg-red-500',
};

const ENTITY_ICONS: Record<string, LucideIcon> = {
  garden: Flower2,
  plot: Map,
  sub_plot: Grid3X3,
  plant_instance: Sprout,
  harvest: Scissors,
  task: CheckSquare,
  note: StickyNote,
  pest_event: Bug,
  seed_inventory: Sprout,
  cost_entry: DollarSign,
  soil_test: FlaskConical,
};

function formatEntityType(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function summarize(entry: HistoryLog): string {
  const snapshot = entry.snapshot as Record<string, unknown> | null;
  const name = snapshot?.name ?? snapshot?.title ?? snapshot?.plant_name ?? snapshot?.variety_name ?? '';
  const label = name ? `"${name}"` : '';
  const verb = entry.action === 'create' ? 'Created' : entry.action === 'update' ? 'Updated' : 'Deleted';
  return `${verb} ${formatEntityType(entry.entity_type).toLowerCase()} ${label}`.trim();
}

function formatChangedFields(fieldChanges: HistoryLog['field_changes']): string {
  if (!fieldChanges || typeof fieldChanges !== 'object') return '-';
  const keys = Object.keys(fieldChanges);
  if (keys.length === 0) return '-';
  return keys.join(', ');
}

function FieldDiffs({ changes }: { changes: Record<string, { old?: unknown; new?: unknown }> }) {
  const entries = Object.entries(changes);
  if (entries.length === 0) return null;

  return (
    <div className="mt-2 space-y-1 text-sm">
      {entries.map(([field, diff]) => (
        <div key={field} className="flex gap-2 items-baseline">
          <span className="font-medium text-muted-foreground min-w-[100px]">
            {field.replace(/_/g, ' ')}
          </span>
          <span className="text-red-600 dark:text-red-400 line-through">
            {String(diff.old ?? '(empty)')}
          </span>
          <span className="text-muted-foreground">&rarr;</span>
          <span className="text-green-600 dark:text-green-400">
            {String(diff.new ?? '(empty)')}
          </span>
        </div>
      ))}
    </div>
  );
}

function TimelineEntry({ entry }: { entry: HistoryLog }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = ENTITY_ICONS[entry.entity_type] ?? History;
  const hasChanges = entry.field_changes && typeof entry.field_changes === 'object' && Object.keys(entry.field_changes).length > 0;

  return (
    <div className="relative flex gap-3 pb-6 last:pb-0">
      {/* Vertical line */}
      <div className="flex flex-col items-center">
        <div className={cn('w-3 h-3 rounded-full mt-1.5 shrink-0', ACTION_DOT[entry.action] ?? 'bg-gray-400')} />
        <div className="w-px flex-1 bg-border" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-1">
        <button
          className={cn(
            'w-full text-left rounded-lg border p-3 transition-colors',
            ACTION_BORDER[entry.action] ?? 'border-border',
            'border-l-4 hover:bg-accent/50',
          )}
          onClick={() => hasChanges && setExpanded(!expanded)}
          disabled={!hasChanges}
        >
          <div className="flex items-start gap-2">
            <Icon className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{summarize(entry)}</span>
                <Badge variant="outline" className={cn('text-xs', ACTION_COLORS[entry.action])}>
                  {entry.action}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span>
                  {formatDateTime(entry.timestamp)}
                </span>
                {entry.changed_by !== 'system' && (
                  <span>by {entry.changed_by}</span>
                )}
                {entry.notes && (
                  <span className="italic">&mdash; {entry.notes}</span>
                )}
              </div>
            </div>
            {hasChanges && (
              expanded
                ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
          </div>
          {expanded && entry.field_changes && (
            <FieldDiffs changes={entry.field_changes as Record<string, { old?: unknown; new?: unknown }>} />
          )}
        </button>
      </div>
    </div>
  );
}

// Table columns (kept from original)
const historyColumns: Column<HistoryLog>[] = [
  {
    key: 'timestamp',
    label: 'Time',
    render: (row) => formatDateTime(row.timestamp),
  },
  {
    key: 'entity_type',
    label: 'Entity',
    render: (row) => <span className="capitalize">{row.entity_type.replace(/_/g, ' ')}</span>,
  },
  {
    key: 'action',
    label: 'Action',
    render: (row) => (
      <Badge variant="outline" className={ACTION_COLORS[row.action] ?? ''}>{row.action}</Badge>
    ),
  },
  { key: 'changed_by', label: 'Changed By' },
  { key: 'notes', label: 'Notes', render: (row) => row.notes || '-' },
  {
    key: 'field_changes',
    label: 'Fields Changed',
    sortable: false,
    render: (row) => formatChangedFields(row.field_changes),
    getValue: (row) => formatChangedFields(row.field_changes),
  },
];

const ALL_VALUE = '__all__';

export function HistoryPage() {
  const [view, toggleView] = useViewToggle<'timeline' | 'table'>('history-view', 'timeline');

  const [filters, setFilters] = useState<HistoryFilters>({ page: 1, limit: 50 });
  const { data, isLoading } = useFilteredHistory(filters);
  const entries = data?.data ?? [];
  const pagination = data?.pagination;

  const updateFilter = (key: keyof HistoryFilters, value: string | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <History className="w-5 h-5" />
          History Log
        </h2>
        <div className="flex gap-1">
          <Button variant={view === 'timeline' ? 'default' : 'outline'} size="sm" onClick={() => toggleView('timeline')}>
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button variant={view === 'table' ? 'default' : 'outline'} size="sm" onClick={() => toggleView('table')}>
            <TableIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.entity_type ?? ALL_VALUE}
          onValueChange={(v) => updateFilter('entity_type', v === ALL_VALUE ? undefined : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All entities</SelectItem>
            {ENTITY_TYPES.map(t => (
              <SelectItem key={t} value={t}>{formatEntityType(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.action ?? ALL_VALUE}
          onValueChange={(v) => updateFilter('action', v === ALL_VALUE ? undefined : v)}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All actions</SelectItem>
            {ACTIONS.map(a => (
              <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="w-[160px]"
          placeholder="Start date"
          value={filters.start_date ?? ''}
          onChange={(e) => updateFilter('start_date', e.target.value || undefined)}
        />
        <Input
          type="date"
          className="w-[160px]"
          placeholder="End date"
          value={filters.end_date ?? ''}
          onChange={(e) => updateFilter('end_date', e.target.value || undefined)}
        />

        {(filters.entity_type || filters.action || filters.start_date || filters.end_date) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({ page: 1, limit: 50 })}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <History className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">No history entries found.</p>
          </CardContent>
        </Card>
      ) : view === 'table' ? (
        <DataTable data={entries} columns={historyColumns} exportFilename="history" />
      ) : (
        /* Timeline view */
        <div className="pl-1">
          {entries.map((entry) => (
            <TimelineEntry key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => setFilters(prev => ({ ...prev, page: (prev.page ?? 1) - 1 }))}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.total_pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.total_pages}
            onClick={() => setFilters(prev => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
