import { cn } from '@/lib/utils';
import { Sprout, Leaf, Sun, ArrowRightLeft, Check } from 'lucide-react';

const SEED_STAGES = [
  { status: 'seed_started', label: 'Seed Started', icon: Sprout, dateField: 'date_planted' },
  { status: 'germinated', label: 'Germinated', icon: Leaf, dateField: 'date_germinated' },
  { status: 'seedling', label: 'Seedling', icon: Sprout, dateField: null },
  { status: 'hardening_off', label: 'Hardening Off', icon: Sun, dateField: null },
  { status: 'transplanted', label: 'Transplanted', icon: ArrowRightLeft, dateField: 'date_transplanted' },
] as const;

const STATUS_INDEX: Record<string, number> = {};
const ALL_STATUSES = [
  'planned', 'seed_started', 'germinated', 'seedling', 'hardening_off',
  'transplanted', 'vegetative', 'flowering', 'fruiting', 'harvesting',
  'finished', 'failed', 'removed',
];
ALL_STATUSES.forEach((s, i) => { STATUS_INDEX[s] = i; });

interface Props {
  status: string;
  datePlanted?: string | null;
  dateGerminated?: string | null;
  dateTransplanted?: string | null;
}

export function SeedStartingTracker({ status, datePlanted, dateGerminated, dateTransplanted }: Props) {
  const currentIndex = STATUS_INDEX[status] ?? 0;

  const dates: Record<string, string | null | undefined> = {
    date_planted: datePlanted,
    date_germinated: dateGerminated,
    date_transplanted: dateTransplanted,
  };

  return (
    <div className="flex items-center gap-0">
      {SEED_STAGES.map((stage, i) => {
        const stageIndex = STATUS_INDEX[stage.status];
        const isComplete = currentIndex > stageIndex;
        const isCurrent = status === stage.status;
        const Icon = isComplete ? Check : stage.icon;
        const dateValue = stage.dateField ? dates[stage.dateField] : null;

        return (
          <div key={stage.status} className="flex items-center">
            {/* Stage node */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors',
                  isComplete && 'bg-green-500 border-green-500 text-white',
                  isCurrent && 'bg-primary border-primary text-primary-foreground',
                  !isComplete && !isCurrent && 'bg-muted border-border text-muted-foreground',
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={cn(
                'text-[0.65rem] leading-tight text-center max-w-[4.5rem]',
                (isComplete || isCurrent) ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}>
                {stage.label}
              </span>
              {dateValue && (
                <span className="text-[0.6rem] text-muted-foreground">
                  {new Date(dateValue + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
            {/* Connector line */}
            {i < SEED_STAGES.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-6 sm:w-8 mt-[-1.25rem]',
                  currentIndex > stageIndex ? 'bg-green-500' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
