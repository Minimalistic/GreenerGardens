import { useState, useRef, useEffect, useMemo } from 'react';
import { Thermometer, Snowflake, ChevronDown, ChevronUp } from 'lucide-react';
import { useForecast } from '@/hooks/use-weather';
import { Card, CardContent } from '@/components/ui/card';

interface WeatherWarning {
  id: string;
  type: 'frost' | 'freeze' | 'heat';
  date: string;
  temp: number;
  title: string;
  description: string;
}

function getWarningStyle(type: string) {
  if (type === 'frost' || type === 'freeze') return {
    border: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950',
    icon: <Snowflake className="w-5 h-5 text-blue-500 shrink-0" />,
    label: 'Freeze/Frost',
    textColor: 'text-blue-600 dark:text-blue-400',
  };
  return {
    border: 'border-l-orange-500 bg-orange-50 dark:bg-orange-950',
    icon: <Thermometer className="w-5 h-5 text-orange-500 shrink-0" />,
    label: 'Heat',
    textColor: 'text-orange-600 dark:text-orange-400',
  };
}

function WarningCard({ warning }: { warning: WeatherWarning }) {
  const style = getWarningStyle(warning.type);
  return (
    <Card className={`border-l-4 ${style.border}`}>
      <CardContent className="py-3 flex items-center gap-3">
        {style.icon}
        <div>
          <p className="font-medium text-sm">{warning.title}</p>
          <p className="text-xs text-muted-foreground">{warning.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function WarningGroup({ type, warnings }: { type: string; warnings: WeatherWarning[] }) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const style = getWarningStyle(type);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.maxHeight = expanded
        ? `${contentRef.current.scrollHeight}px`
        : '0px';
    }
  }, [expanded]);

  if (warnings.length === 1) {
    return <WarningCard warning={warnings[0]} />;
  }

  const first = warnings[0];
  const remainingCount = warnings.length - 1;

  return (
    <div>
      <Card
        className={`border-l-4 cursor-pointer select-none ${style.border}`}
        onClick={() => setExpanded(!expanded)}
      >
        <CardContent className="py-3 flex items-center gap-3">
          {style.icon}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{first.title}</p>
            <p className="text-xs text-muted-foreground">{first.description}</p>
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
          {warnings.slice(1).map(w => (
            <WarningCard key={w.id} warning={w} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AlertBanner() {
  const { data: forecastData } = useForecast();
  const forecastItems = forecastData?.data ?? [];

  const warnings = useMemo(() => {
    if (forecastItems.length === 0) return [];

    const frostThreshold = 36;
    const heatThreshold = 95;

    // Group forecast by date — track min and max temps
    const dateStats = new Map<string, { min: number; max: number }>();
    for (const item of forecastItems) {
      const date = item.dt_txt.split(' ')[0];
      const existing = dateStats.get(date);
      if (existing) {
        existing.min = Math.min(existing.min, item.temp_min_f);
        existing.max = Math.max(existing.max, item.temp_max_f);
      } else {
        dateStats.set(date, { min: item.temp_min_f, max: item.temp_max_f });
      }
    }

    const result: WeatherWarning[] = [];
    for (const [date, { min, max }] of dateStats) {
      if (min <= frostThreshold) {
        const isFreezing = min <= 32;
        result.push({
          id: `frost-${date}`,
          type: isFreezing ? 'freeze' : 'frost',
          date,
          temp: min,
          title: isFreezing
            ? `Freeze Warning: ${Math.round(min)}°F expected on ${date}`
            : `Frost Advisory: ${Math.round(min)}°F expected on ${date}`,
          description: `Low temperature of ${Math.round(min)}°F forecasted. Cover or bring in frost-sensitive plants.`,
        });
      }
      if (max >= heatThreshold) {
        result.push({
          id: `heat-${date}`,
          type: 'heat',
          date,
          temp: max,
          title: `Heat Warning: ${Math.round(max)}°F expected on ${date}`,
          description: `High temperature of ${Math.round(max)}°F forecasted. Provide shade and extra water for heat-sensitive plants.`,
        });
      }
    }

    return result;
  }, [forecastItems]);

  if (warnings.length === 0) return null;

  // Group by frost/heat
  const grouped = warnings.reduce((acc: Record<string, WeatherWarning[]>, w) => {
    const key = w.type === 'heat' ? 'heat' : 'frost';
    if (!acc[key]) acc[key] = [];
    acc[key].push(w);
    return acc;
  }, {} as Record<string, WeatherWarning[]>);

  return (
    <div className="space-y-2">
      {Object.entries(grouped).map(([type, groupWarnings]) => (
        <WarningGroup key={type} type={type} warnings={groupWarnings} />
      ))}
    </div>
  );
}
