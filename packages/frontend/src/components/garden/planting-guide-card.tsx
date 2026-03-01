import { useNavigate } from 'react-router-dom';
import { Sprout, Clock, ArrowRight } from 'lucide-react';
import { usePlantingGuide } from '@/hooks/use-planting-guide';
import { useGardenContext } from '@/contexts/garden-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function GuideSection({ title, icon: Icon, entries }: { title: string; icon: typeof Sprout; entries: any[] }) {
  const navigate = useNavigate();
  if (entries.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1 mb-2">
        <Icon className="w-3.5 h-3.5" />
        {title}
      </h4>
      <div className="flex flex-wrap gap-2">
        {entries.slice(0, 5).map((entry: any) => (
          <Badge
            key={entry.plant_id}
            variant="secondary"
            className="cursor-pointer hover:bg-secondary/80"
            onClick={() => navigate(`/catalog/${entry.plant_id}`)}
          >
            {entry.common_name}
            <span className="ml-1 text-xs text-muted-foreground">({entry.days_remaining}d left)</span>
          </Badge>
        ))}
        {entries.length > 5 && (
          <Badge variant="outline">+{entries.length - 5} more</Badge>
        )}
      </div>
    </div>
  );
}

export function PlantingGuideCard() {
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
        <CardTitle className="text-base flex items-center gap-2">
          <Sprout className="w-4 h-4" />
          What to Plant Now
        </CardTitle>
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
