import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, Clock, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { usePlantingGuide } from '@/hooks/use-planting-guide';
import { useGardenContext } from '@/contexts/garden-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PLANT_TYPE_COLORS } from '@/lib/plant-type-colors';
import { plantTypeEmoji } from '@/lib/plant-type-emoji';

interface GuideEntry {
  plant_id: string;
  common_name: string;
  plant_type: string;
  emoji?: string;
  days_remaining: number;
}

function GuideSection({ title, icon: Icon, entries }: { title: string; icon: typeof Sprout; entries: GuideEntry[] }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.maxHeight = expanded
        ? `${contentRef.current.scrollHeight}px`
        : '0px';
    }
  }, [expanded]);

  if (entries.length === 0) return null;

  const hasMore = entries.length > 5;

  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
        <Icon className="w-3.5 h-3.5" />
        {title}
      </h4>
      <div className="flex flex-wrap gap-2">
        {entries.slice(0, 5).map((entry: GuideEntry) => (
          <Badge
            key={entry.plant_id}
            variant="outline"
            className={cn(
              'cursor-pointer hover:ring-1 hover:ring-ring',
              PLANT_TYPE_COLORS[entry.plant_type] ?? PLANT_TYPE_COLORS.other,
            )}
            onClick={() => navigate(`/catalog/${entry.plant_id}`)}
          >
            <span className="mr-0.5 plant-emoji">{entry.emoji || plantTypeEmoji(entry.plant_type)}</span>
            {entry.common_name}
            <span className="ml-1 text-xs opacity-70">({entry.days_remaining}d left)</span>
          </Badge>
        ))}
        {hasMore && (
          <Badge
            variant="outline"
            className="cursor-pointer hover:ring-1 hover:ring-ring"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Show less' : `+${entries.length - 5} more`}
            {expanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Badge>
        )}
      </div>
      {hasMore && (
        <div
          ref={contentRef}
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            maxHeight: expanded ? contentRef.current?.scrollHeight ?? 0 : 0,
            opacity: expanded ? 1 : 0,
          }}
        >
          <div className="flex flex-wrap gap-2 pt-2">
            {entries.slice(5).map((entry: GuideEntry) => (
              <Badge
                key={entry.plant_id}
                variant="outline"
                className={cn(
                  'cursor-pointer hover:ring-1 hover:ring-ring',
                  PLANT_TYPE_COLORS[entry.plant_type] ?? PLANT_TYPE_COLORS.other,
                )}
                onClick={() => navigate(`/catalog/${entry.plant_id}`)}
              >
                <span className="mr-0.5 plant-emoji">{entry.emoji || plantTypeEmoji(entry.plant_type)}</span>
                {entry.common_name}
                <span className="ml-1 text-xs opacity-70">({entry.days_remaining}d left)</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PlantingGuideCard() {
  const navigate = useNavigate();
  const { currentGardenId } = useGardenContext();
  const { data, isLoading } = usePlantingGuide(currentGardenId);
  const guide = data?.data;

  if (isLoading || !guide) return null;

  const totalItems = (guide.start_indoors?.length ?? 0) + (guide.direct_sow?.length ?? 0) +
    (guide.transplant?.length ?? 0) + (guide.coming_up?.length ?? 0);

  if (totalItems === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sprout className="w-4 h-4" />
            What to Plant Now
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')}>View calendar</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <GuideSection title="Start Indoors" icon={Sprout} entries={guide.start_indoors ?? []} />
        <GuideSection title="Direct Sow" icon={Sprout} entries={guide.direct_sow ?? []} />
        <GuideSection title="Transplant" icon={ArrowRight} entries={guide.transplant ?? []} />
        <GuideSection title="Coming Up" icon={Clock} entries={guide.coming_up ?? []} />
      </CardContent>
    </Card>
  );
}
