import { cn } from '@/lib/utils';

const STATUS_CELL_COLORS: Record<string, string> = {
  planned: 'bg-gray-100 border-gray-300',
  seed_started: 'bg-amber-50 border-amber-300',
  seedling: 'bg-lime-50 border-lime-300',
  transplanted: 'bg-green-50 border-green-300',
  vegetative: 'bg-emerald-50 border-emerald-300',
  flowering: 'bg-pink-50 border-pink-300',
  fruiting: 'bg-orange-50 border-orange-300',
  harvesting: 'bg-yellow-50 border-yellow-300',
  finished: 'bg-stone-100 border-stone-300',
};

interface SubPlotGridProps {
  subPlots: any[];
  cols: number;
  onCellClick: (subPlotId: string) => void;
}

export function SubPlotGrid({ subPlots, cols, onCellClick }: SubPlotGridProps) {
  if (subPlots.length === 0) {
    return <p className="text-sm text-muted-foreground">No sub-plots generated.</p>;
  }

  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {subPlots.map((sp: any) => {
        const hasPlant = !!sp.plant_instance_id;
        return (
          <button
            key={sp.id}
            className={cn(
              'aspect-square rounded border-2 flex items-center justify-center text-xs transition-colors min-w-[44px] min-h-[44px]',
              hasPlant
                ? STATUS_CELL_COLORS.vegetative
                : 'bg-muted/50 border-dashed border-border hover:bg-muted hover:border-primary'
            )}
            onClick={() => onCellClick(sp.id)}
            title={hasPlant ? 'Has plant' : 'Empty - click to plant'}
          >
            {hasPlant ? '🌱' : '+'}
          </button>
        );
      })}
    </div>
  );
}
