import { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Thermometer, Snowflake, ChevronDown, ChevronUp } from 'lucide-react';
import { useActiveAlerts } from '@/hooks/use-alerts';
import { useGardenContext } from '@/contexts/garden-context';
import { Card, CardContent } from '@/components/ui/card';

function getAlertStyle(taskType: string) {
  if (taskType === 'frost_alert') return {
    border: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950',
    icon: <Snowflake className="w-5 h-5 text-blue-500 shrink-0" />,
    label: 'Freeze/Frost',
    textColor: 'text-blue-600 dark:text-blue-400',
  };
  if (taskType === 'heat_alert') return {
    border: 'border-l-orange-500 bg-orange-50 dark:bg-orange-950',
    icon: <Thermometer className="w-5 h-5 text-orange-500 shrink-0" />,
    label: 'Heat',
    textColor: 'text-orange-600 dark:text-orange-400',
  };
  return {
    border: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950',
    icon: <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />,
    label: 'Alert',
    textColor: 'text-yellow-600 dark:text-yellow-400',
  };
}

function AlertCard({ alert }: { alert: any }) {
  const style = getAlertStyle(alert.task_type);
  return (
    <Card className={`border-l-4 ${style.border}`}>
      <CardContent className="py-3 flex items-center gap-3">
        {style.icon}
        <div>
          <p className="font-medium text-sm">{alert.title}</p>
          {alert.description && <p className="text-xs text-muted-foreground">{alert.description}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function AlertGroup({ type, alerts }: { type: string; alerts: any[] }) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const style = getAlertStyle(type);

  // Update maxHeight when expanded changes so the transition works correctly
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.maxHeight = expanded
        ? `${contentRef.current.scrollHeight}px`
        : '0px';
    }
  }, [expanded]);

  if (alerts.length === 1) {
    return <AlertCard alert={alerts[0]} />;
  }

  const firstAlert = alerts[0];
  const remainingCount = alerts.length - 1;

  return (
    <div>
      <Card
        className={`border-l-4 cursor-pointer select-none ${style.border}`}
        onClick={() => setExpanded(!expanded)}
      >
        <CardContent className="py-3 flex items-center gap-3">
          {style.icon}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{firstAlert.title}</p>
            {firstAlert.description && <p className="text-xs text-muted-foreground">{firstAlert.description}</p>}
          </div>
          <span className={`flex items-center gap-1 text-xs font-medium ${style.textColor} shrink-0`}>
            {expanded ? 'Hide' : `+${remainingCount} more`}
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </CardContent>
      </Card>
      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: expanded ? contentRef.current?.scrollHeight ?? 0 : 0,
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="space-y-2 pt-2">
          {alerts.slice(1).map((alert: any) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AlertBanner() {
  const { currentGardenId } = useGardenContext();
  const { data } = useActiveAlerts(currentGardenId);
  const alerts = data?.data ?? [];

  if (alerts.length === 0) return null;

  // Group alerts by type
  const grouped = alerts.reduce((acc: Record<string, any[]>, alert: any) => {
    const key = alert.task_type ?? 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(alert);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-2">
      {Object.entries(grouped).map(([type, groupAlerts]) => (
        <AlertGroup key={type} type={type} alerts={groupAlerts} />
      ))}
    </div>
  );
}
