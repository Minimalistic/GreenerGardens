import { useNavigate } from 'react-router-dom';
import { Map, Sprout, Scissors, Plus } from 'lucide-react';
import { useGardenContext } from '@/contexts/garden-context';
import { usePlotsByGarden } from '@/hooks/use-plots';
import { usePlantInstances } from '@/hooks/use-plant-instances';
import { useHarvestStats } from '@/hooks/use-harvests';
import { StatCard } from '@/components/garden/stat-card';
import { ActivityFeed } from '@/components/garden/activity-feed';
import { EmptyState } from '@/components/garden/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function Dashboard() {
  const navigate = useNavigate();
  const { currentGardenId } = useGardenContext();
  const { data: plotsData } = usePlotsByGarden(currentGardenId);
  const { data: plantsData } = usePlantInstances();
  const { data: statsData } = useHarvestStats();

  const plotCount = plotsData?.data?.length ?? 0;
  const plantCount = plantsData?.data?.length ?? 0;
  const harvestCount = statsData?.data?.this_season_count ?? 0;

  if (plotCount === 0 && plantCount === 0) {
    return (
      <EmptyState
        icon={Map}
        title="Welcome to Your Garden!"
        description="Start by creating your first plot. You can add raised beds, containers, or in-ground plantings."
        actionLabel="Create First Plot"
        onAction={() => navigate('/garden')}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Garden Overview</h2>
        <Button size="sm" onClick={() => navigate('/garden')}>
          <Plus className="w-4 h-4 mr-1" />
          Add Plot
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Map} label="Plots" value={plotCount} />
        <StatCard icon={Sprout} label="Active Plants" value={plantCount} />
        <StatCard icon={Scissors} label="Harvests This Season" value={harvestCount} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityFeed />
        </CardContent>
      </Card>
    </div>
  );
}
