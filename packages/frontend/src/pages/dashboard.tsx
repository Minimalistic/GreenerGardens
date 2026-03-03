import { useNavigate } from 'react-router-dom';
import { Map, Sprout, Scissors, Plus, CheckCircle2, Calendar } from 'lucide-react';
import { useGardenContext } from '@/contexts/garden-context';
import { usePlotsByGarden } from '@/hooks/use-plots';
import { usePlantInstances } from '@/hooks/use-plant-instances';
import { useHarvestStats } from '@/hooks/use-harvests';
import { useTodayTasks, useOverdueTasks, useCompleteTask } from '@/hooks/use-tasks';
import { StatCard } from '@/components/garden/stat-card';
import { ActivityFeed } from '@/components/garden/activity-feed';
import { EmptyState } from '@/components/garden/empty-state';
import { WeatherWidget } from '@/components/garden/weather-widget';
import { PlantingGuideCard } from '@/components/garden/planting-guide-card';
import { AlertBanner } from '@/components/garden/alert-banner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function Dashboard() {
  const navigate = useNavigate();
  const { currentGardenId } = useGardenContext();
  const { data: plotsData } = usePlotsByGarden(currentGardenId);
  const { data: plantsData } = usePlantInstances();
  const { data: statsData } = useHarvestStats();

  const { data: todayTasksData } = useTodayTasks();
  const { data: overdueTasksData } = useOverdueTasks();
  const completeTask = useCompleteTask();

  const plotCount = plotsData?.data?.length ?? 0;
  const plantCount = plantsData?.data?.length ?? 0;
  const harvestCount = statsData?.data?.this_season_count ?? 0;
  const todayTasks = todayTasksData?.data ?? [];
  const overdueTasks = overdueTasksData?.data ?? [];
  const dashboardTasks = [...overdueTasks, ...todayTasks].slice(0, 5);

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
        <StatCard icon={Map} label="Plots" value={plotCount} href="/garden" />
        <StatCard icon={Sprout} label="Active Plants" value={plantCount} href="/catalog" />
        <StatCard icon={Scissors} label="Harvests This Season" value={harvestCount} href="/harvests" />
      </div>

      <AlertBanner />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WeatherWidget />

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Today's Tasks
                {overdueTasks.length > 0 && (
                  <span className="text-xs bg-destructive text-destructive-foreground rounded-full px-2 py-0.5">
                    {overdueTasks.length} overdue
                  </span>
                )}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>View all</Button>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks for today. Enjoy your garden!</p>
            ) : (
              <div className="space-y-2">
                {dashboardTasks.map(task => {
                  const canNavigate = task.entity_type === 'plant_instance' && task.entity_id;
                  return (
                    <div key={task.id} className="flex items-center gap-2 text-sm">
                      <button
                        onClick={() => completeTask.mutate(task.id)}
                        className="text-muted-foreground hover:text-primary shrink-0"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <span
                        className={`truncate ${canNavigate ? 'cursor-pointer hover:underline text-primary' : ''}`}
                        onClick={canNavigate ? () => navigate(`/plants/${task.entity_id}`) : undefined}
                      >
                        {task.title}
                      </span>
                      {task.due_date && task.due_date < new Date().toISOString().split('T')[0] && (
                        <span className="text-xs text-destructive shrink-0">overdue</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PlantingGuideCard />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>View all</Button>
          </div>
        </CardHeader>
        <CardContent>
          <ActivityFeed />
        </CardContent>
      </Card>
    </div>
  );
}
