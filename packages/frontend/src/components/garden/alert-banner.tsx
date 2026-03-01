import { AlertTriangle, Thermometer, Snowflake } from 'lucide-react';
import { useActiveAlerts } from '@/hooks/use-alerts';
import { useGardenContext } from '@/contexts/garden-context';
import { Card, CardContent } from '@/components/ui/card';

export function AlertBanner() {
  const { currentGardenId } = useGardenContext();
  const { data } = useActiveAlerts(currentGardenId);
  const alerts = data?.data ?? [];

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert: any) => {
        const isFrost = alert.task_type === 'frost_alert';
        const isHeat = alert.task_type === 'heat_alert';

        return (
          <Card key={alert.id} className={`border-l-4 ${isFrost ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-950' : isHeat ? 'border-l-orange-500 bg-orange-50 dark:bg-orange-950' : 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950'}`}>
            <CardContent className="py-3 flex items-center gap-3">
              {isFrost ? <Snowflake className="w-5 h-5 text-blue-500" /> :
               isHeat ? <Thermometer className="w-5 h-5 text-orange-500" /> :
               <AlertTriangle className="w-5 h-5 text-yellow-500" />}
              <div>
                <p className="font-medium text-sm">{alert.title}</p>
                {alert.description && <p className="text-xs text-muted-foreground">{alert.description}</p>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
