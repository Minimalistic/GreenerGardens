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
};

interface ActivityFeedItemProps {
  item: {
    id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    timestamp: string;
    snapshot?: Record<string, any> | null;
    field_changes?: Record<string, any> | null;
  };
}

export function ActivityFeedItem({ item }: ActivityFeedItemProps) {
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

  return (
    <div className="flex gap-3 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors">
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
