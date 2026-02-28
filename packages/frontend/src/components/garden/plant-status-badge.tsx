import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-700 border-gray-200',
  seed_started: 'bg-amber-50 text-amber-700 border-amber-200',
  seedling: 'bg-lime-50 text-lime-700 border-lime-200',
  transplanted: 'bg-green-50 text-green-700 border-green-200',
  vegetative: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  flowering: 'bg-pink-50 text-pink-700 border-pink-200',
  fruiting: 'bg-orange-50 text-orange-700 border-orange-200',
  harvesting: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  finished: 'bg-stone-100 text-stone-600 border-stone-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  removed: 'bg-gray-50 text-gray-500 border-gray-200',
};

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  seed_started: 'Seed Started',
  seedling: 'Seedling',
  transplanted: 'Transplanted',
  vegetative: 'Vegetative',
  flowering: 'Flowering',
  fruiting: 'Fruiting',
  harvesting: 'Harvesting',
  finished: 'Finished',
  failed: 'Failed',
  removed: 'Removed',
};

interface PlantStatusBadgeProps {
  status: string;
  className?: string;
}

export function PlantStatusBadge({ status, className }: PlantStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(STATUS_COLORS[status] ?? '', className)}
    >
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
