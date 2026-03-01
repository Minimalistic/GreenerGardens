import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  seed_started: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-800',
  germinated: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800',
  seedling: 'bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-900 dark:text-lime-200 dark:border-lime-800',
  hardening_off: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900 dark:text-teal-200 dark:border-teal-800',
  transplanted: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800',
  vegetative: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-200 dark:border-emerald-800',
  flowering: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900 dark:text-pink-200 dark:border-pink-800',
  fruiting: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-800',
  harvesting: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-800',
  finished: 'bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700',
  failed: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800',
  removed: 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
};

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  seed_started: 'Seed Started',
  germinated: 'Germinated',
  seedling: 'Seedling',
  hardening_off: 'Hardening Off',
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
