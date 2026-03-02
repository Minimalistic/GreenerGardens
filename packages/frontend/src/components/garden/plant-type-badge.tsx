import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PLANT_TYPE_COLORS } from '@/lib/plant-type-colors';

interface PlantTypeBadgeProps {
  plantType: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function PlantTypeBadge({ plantType, className, onClick }: PlantTypeBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'capitalize',
        PLANT_TYPE_COLORS[plantType] ?? PLANT_TYPE_COLORS.other,
        onClick && 'cursor-pointer hover:ring-1 hover:ring-ring',
        className,
      )}
      onClick={onClick}
    >
      {plantType}
    </Badge>
  );
}
