import { useRecentActivity } from '@/hooks/use-history';
import { DataTable, type Column } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { History } from 'lucide-react';
import type { HistoryLog } from '@gardenvault/shared';

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

function formatChangedFields(fieldChanges: HistoryLog['field_changes']): string {
  if (!fieldChanges || typeof fieldChanges !== 'object') return '-';
  const keys = Object.keys(fieldChanges);
  if (keys.length === 0) return '-';
  return keys.join(', ');
}

const historyColumns: Column<HistoryLog>[] = [
  {
    key: 'timestamp',
    label: 'Time',
    render: (row) => new Date(row.timestamp).toLocaleString('en', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    }),
  },
  {
    key: 'entity_type',
    label: 'Entity',
    render: (row) => (
      <span className="capitalize">{row.entity_type.replace(/_/g, ' ')}</span>
    ),
  },
  {
    key: 'action',
    label: 'Action',
    render: (row) => (
      <Badge variant="outline" className={ACTION_COLORS[row.action] ?? ''}>
        {row.action}
      </Badge>
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

export function HistoryPage() {
  const { data, isLoading } = useRecentActivity(100);
  const entries = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <History className="w-5 h-5" />
          History Log
        </h2>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <History className="w-5 h-5" />
        History Log
      </h2>
      <DataTable data={entries} columns={historyColumns} exportFilename="history" />
    </div>
  );
}
