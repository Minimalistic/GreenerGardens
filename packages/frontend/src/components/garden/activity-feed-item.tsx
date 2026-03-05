import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ACTION_CONFIG = {
  create: { icon: Plus, color: 'text-green-600', label: 'Created' },
  update: { icon: Pencil, color: 'text-blue-600', label: 'Updated' },
  delete: { icon: Trash2, color: 'text-red-600', label: 'Deleted' },
} as const;

const ENTITY_LABELS: Record<string, string> = {
  garden: 'garden',
  plot: 'plot',
  sub_plot: 'sub-plot',
  plant_instance: 'plant',
  harvest: 'harvest',
  task: 'task',
  pest_event: 'pest event',
  soil_test: 'soil test',
  note: 'note',
  seed: 'seed',
  cost_entry: 'cost entry',
};

function entityPath(type: string, id: string): string | null {
  switch (type) {
    case 'garden': return '/garden';
    case 'plot': return `/garden/plots/${id}`;
    case 'sub_plot': return null;
    case 'plant_instance': return `/plants/${id}`;
    case 'harvest': return '/harvests';
    case 'task': return '/tasks';
    case 'pest_event': return '/pest-events';
    case 'soil_test': return '/soil-tests';
    case 'note': return '/notes';
    case 'seed': return '/seeds';
    case 'cost_entry': return '/settings';
    default: return null;
  }
}

interface ActivityFeedItemProps {
  item: {
    id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    timestamp: string;
    snapshot?: Record<string, unknown> | null;
    field_changes?: Record<string, unknown> | null;
  };
}

export function ActivityFeedItem({ item }: ActivityFeedItemProps) {
  const navigate = useNavigate();
  const config = ACTION_CONFIG[item.action as keyof typeof ACTION_CONFIG] ?? ACTION_CONFIG.update;
  const Icon = config.icon;
  const entityLabel = ENTITY_LABELS[item.entity_type] ?? item.entity_type;

  const entityName = item.snapshot?.name ?? item.snapshot?.common_name ?? '';

  let description = `${config.label} ${entityLabel}`;
  if (entityName) description += ` "${entityName}"`;

  if (item.action === 'update' && item.field_changes) {
    const fields = Object.keys(item.field_changes);
    if (fields.length > 0 && fields.length <= 3) {
      description += ` (${fields.join(', ')})`;
    }
  }

  const timeAgo = formatDistanceToNow(new Date(item.timestamp), { addSuffix: true });
  const path = item.action !== 'delete' ? entityPath(item.entity_type, item.entity_id) : null;

  return (
    <div
      className={`flex gap-3 px-2 py-2 rounded-lg transition-colors ${
        path ? 'cursor-pointer hover:bg-muted' : 'hover:bg-muted/50'
      }`}
      onClick={path ? () => navigate(path) : undefined}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-muted ${config.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{description}</p>
        <p className="text-xs text-muted-foreground">{timeAgo}</p>
      </div>
    </div>
  );
}
