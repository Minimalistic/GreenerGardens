import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudRain,
  CloudSnow,
  Droplets,
  Expand,
  ExternalLink,
  Info,
  MapPin,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
  AlertTriangle,
  Gauge,
  Eye,
  CloudSun,
  ShieldAlert,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  useCurrentWeather,
  useForecast,
  useWeatherStatus,
  useWeatherDailySummary,
  useNwsAlerts,
  useWeatherLocation,
} from '@/hooks/use-weather';
import type { ForecastItem } from '@/hooks/use-weather';
import { formatDistanceToNow, format, subDays } from 'date-fns';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getWeatherIcon(main: string, className: string = 'w-5 h-5') {
  switch (main.toLowerCase()) {
    case 'rain':
    case 'drizzle':
      return <CloudRain className={className} />;
    case 'snow':
      return <CloudSnow className={className} />;
    case 'clear':
      return <Sun className={className} />;
    default:
      return <Cloud className={className} />;
  }
}

function formatHour(dtTxt: string) {
  const time = dtTxt.split(' ')[1].slice(0, 5);
  const hour = parseInt(time.split(':')[0]);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}${ampm}`;
}

interface DayForecast {
  date: string;
  dayLabel: string;
  shortDay: string;
  high: number;
  low: number;
  avgHumidity: number;
  avgWind: number;
  totalPrecip: number;
  main: string;
  entries: ForecastItem[];
}

function groupForecastByDay(items: ForecastItem[]): DayForecast[] {
  const days = new Map<
    string,
    { temps: number[]; humidities: number[]; winds: number[]; precips: number[]; main: string; entries: ForecastItem[] }
  >();
  for (const item of items) {
    const date = item.dt_txt.split(' ')[0];
    if (!days.has(date)) {
      days.set(date, { temps: [], humidities: [], winds: [], precips: [], main: item.weather_main, entries: [] });
    }
    const day = days.get(date)!;
    day.temps.push(item.temperature_f);
    day.humidities.push(item.humidity_pct);
    day.winds.push(item.wind_speed_mph);
    day.precips.push(item.precipitation_inches);
    day.entries.push(item);
  }

  const today = new Date().toISOString().split('T')[0];

  return Array.from(days.entries()).map(([date, d]) => ({
    date,
    dayLabel: new Date(date + 'T12:00:00').toLocaleDateString('en', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    }),
    shortDay: date === today
      ? 'Today'
      : new Date(date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' }),
    high: Math.round(Math.max(...d.temps)),
    low: Math.round(Math.min(...d.temps)),
    avgHumidity: Math.round(d.humidities.reduce((a, b) => a + b, 0) / d.humidities.length),
    avgWind: Math.round(d.winds.reduce((a, b) => a + b, 0) / d.winds.length * 10) / 10,
    totalPrecip: Math.round(d.precips.reduce((a, b) => a + b, 0) * 100) / 100,
    main: d.main,
    entries: d.entries,
  }));
}

// ── Metric Tips ──────────────────────────────────────────────────────────────

const METRIC_INFO: Record<string, { tip: string; link?: { label: string; href: string } }> = {
  humidity: {
    tip: 'High humidity (>80%) promotes fungal diseases like blight and powdery mildew. Low humidity (<30%) increases water stress.',
    link: { label: 'Pest & Disease Log', href: '/pest-events' },
  },
  wind: {
    tip: 'Strong winds (>20 mph) can damage tall plants, dry soil quickly, and stress transplants. Consider windbreaks for exposed beds.',
  },
  cloudCover: {
    tip: 'Heavy cloud cover reduces photosynthesis. Full-sun crops need 6+ hours of direct sunlight. Partial shade is fine for lettuce, spinach, and herbs.',
  },
  uvIndex: {
    tip: 'UV 6+ can scorch tender seedlings and newly transplanted starts. Consider shade cloth during peak UV hours.',
  },
  pressure: {
    tip: 'Falling pressure often signals incoming rain or storms. Rising pressure generally means clearing skies and good planting weather.',
  },
  dayLength: {
    tip: 'Day length triggers bolting in lettuce, spinach, and other cool-season crops. Short days (<12 hrs) can slow warm-season crop growth.',
    link: { label: 'Planting Calendar', href: '/calendar' },
  },
  sunrise: {
    tip: 'Morning sun dries dew quickly, reducing fungal disease risk. East-facing beds get the best morning light.',
  },
  sunset: {
    tip: 'Late sunsets mean longer growing hours. Plan evening watering after sunset to minimize evaporation.',
  },
  precipitation: {
    tip: 'Track rainfall to adjust irrigation. Most vegetables need 1-1.5" per week total from rain + watering.',
    link: { label: 'Soil Tests', href: '/soil-tests' },
  },
};

function InteractiveDetailItem({
  icon: Icon,
  label,
  value,
  metricKey,
}: {
  icon: typeof Thermometer;
  label: string;
  value: string;
  metricKey?: string;
}) {
  const info = metricKey ? METRIC_INFO[metricKey] : undefined;

  if (!info) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
        <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium">{value}</p>
        </div>
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 cursor-help hover:bg-muted/80 transition-colors group">
          <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {label}
              <Info className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
            <p className="text-sm font-medium">{value}</p>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-xs leading-relaxed">{info.tip}</p>
        {info.link && (
          <a
            href={info.link.href}
            className="text-xs text-primary flex items-center gap-1 mt-1.5 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {info.link.label}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Hourly Strip ─────────────────────────────────────────────────────────────

function HourlyStrip({ entries }: { entries: ForecastItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative -mx-4 sm:-mx-6">
      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto px-4 sm:px-6 pb-2 scrollbar-thin scrollbar-thumb-muted-foreground/20"
      >
        {entries.map((entry) => (
          <div
            key={entry.dt_txt}
            className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl bg-muted/30 text-xs shrink-0 min-w-[3.5rem]"
          >
            <span className="text-muted-foreground font-medium">{formatHour(entry.dt_txt)}</span>
            {getWeatherIcon(entry.weather_main, 'w-5 h-5 text-muted-foreground')}
            <span className="font-semibold">{Math.round(entry.temperature_f)}°</span>
            {entry.precipitation_probability > 0 && (
              <span className="text-blue-500 text-[10px] flex items-center gap-0.5">
                <Droplets className="w-2.5 h-2.5" />
                {entry.precipitation_probability}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Forecast Day (expandable) ────────────────────────────────────────────────

function ForecastDayRow({ day, isExpanded, onToggle }: { day: DayForecast; isExpanded: boolean; onToggle: () => void }) {
  const chartData = day.entries.map((entry) => ({
    time: formatHour(entry.dt_txt),
    temp: Math.round(entry.temperature_f),
    feelsLike: Math.round(entry.feels_like_f),
    humidity: Math.round(entry.humidity_pct),
    wind: entry.wind_speed_mph,
    precip: Math.round(entry.precipitation_probability),
  }));

  // Temperature range bar
  const forecastTempMin = 0;
  const forecastTempMax = 100;
  const range = forecastTempMax - forecastTempMin || 1;
  const leftPct = ((day.low - forecastTempMin) / range) * 100;
  const widthPct = ((day.high - day.low) / range) * 100;

  return (
    <div className="border-b last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 py-3 px-1 hover:bg-muted/30 transition-colors text-left"
      >
        <span className="text-sm w-14 shrink-0 text-muted-foreground">{day.shortDay}</span>
        <span className="shrink-0">{getWeatherIcon(day.main, 'w-5 h-5 text-muted-foreground')}</span>
        {day.totalPrecip > 0 ? (
          <span className="text-xs text-blue-500 w-10 shrink-0">{Math.round(day.totalPrecip * 100) > 0 ? `${day.totalPrecip}"` : ''}</span>
        ) : (
          <span className="w-10 shrink-0" />
        )}
        <span className="text-sm text-muted-foreground w-8 text-right shrink-0">{day.low}°</span>
        <div className="flex-1 h-1.5 rounded-full bg-muted relative mx-1">
          <div
            className="absolute h-full rounded-full bg-gradient-to-r from-blue-400 via-amber-400 to-orange-400"
            style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 3)}%` }}
          />
        </div>
        <span className="text-sm font-medium w-8 shrink-0">{day.high}°</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="px-1 pb-4 space-y-3">
          <HourlyStrip entries={day.entries} />
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} unit="°" />
              <RechartsTooltip
                contentStyle={{ fontSize: 11 }}
                formatter={(value: number, name: string) => [
                  `${value}°F`,
                  name === 'temp' ? 'Temperature' : 'Feels Like',
                ]}
              />
              <Area type="monotone" dataKey="temp" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} name="temp" />
              <Area type="monotone" dataKey="feelsLike" stroke="#f59e0b" fill="none" strokeWidth={1} strokeDasharray="4 4" name="feelsLike" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} unit="%" />
                <RechartsTooltip
                  contentStyle={{ fontSize: 11 }}
                  formatter={(value: number, name: string) => [
                    `${value}%`,
                    name === 'humidity' ? 'Humidity' : 'Rain Chance',
                  ]}
                />
                <Bar dataKey="humidity" fill="#3b82f6" fillOpacity={0.5} radius={[2, 2, 0, 0]} name="humidity" />
                <Bar dataKey="precip" fill="#06b6d4" fillOpacity={0.5} radius={[2, 2, 0, 0]} name="precip" />
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={90}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="time" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} unit=" mph" />
                <RechartsTooltip
                  contentStyle={{ fontSize: 11 }}
                  formatter={(value: number) => [`${value} mph`, 'Wind']}
                />
                <Area type="monotone" dataKey="wind" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Map Card ─────────────────────────────────────────────────────────────────

function WeatherMapCard({
  title,
  iframeSrc,
  fullUrl,
  className = '',
}: {
  title: string;
  iframeSrc: string;
  fullUrl: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <div className={`relative group ${className}`}>
        <div className="absolute top-3 left-3 z-10 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 text-xs font-medium shadow-sm">
          {title}
        </div>
        <div className="relative rounded-2xl overflow-hidden border bg-muted/30 w-full h-full min-h-[200px]">
          <iframe
            src={iframeSrc}
            className="absolute inset-0 w-full h-full"
            title={title}
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin"
          />
          <div className="absolute inset-0 bg-transparent cursor-pointer" onClick={() => setExpanded(true)} />
          <div className="absolute bottom-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setExpanded(true)}
              className="bg-background/90 backdrop-blur-sm border rounded-lg p-1.5 hover:bg-background shadow-sm"
              title="Expand"
            >
              <Expand className="w-3.5 h-3.5" />
            </button>
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-background/90 backdrop-blur-sm border rounded-lg p-1.5 hover:bg-background shadow-sm"
              title="Open in new tab"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-[95vw] w-[95vw] max-h-[90vh] h-[90vh] p-0 flex flex-col">
          <DialogHeader className="px-4 pt-4 pb-2 shrink-0">
            <DialogTitle className="text-sm flex items-center justify-between">
              {title}
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 font-normal"
              >
                Open in new tab
                <ExternalLink className="w-3 h-3" />
              </a>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 px-4 pb-4">
            <iframe
              src={iframeSrc}
              className="w-full h-full rounded-lg border"
              title={title}
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── History Chart ────────────────────────────────────────────────────────────

function HistoryChart({ dailySummary }: { dailySummary: Array<{ date: string; high_f: number | null; low_f: number | null; avg_f: number | null; precipitation_total_inches: number | null; frost_occurred: boolean }> }) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const chartData = useMemo(() => {
    return [...dailySummary]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((day) => ({
        date: day.date,
        label: new Date(day.date + 'T12:00:00').toLocaleDateString('en', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        shortLabel: new Date(day.date + 'T12:00:00').toLocaleDateString('en', {
          weekday: 'short',
        }),
        high: day.high_f != null ? Math.round(day.high_f) : null,
        low: day.low_f != null ? Math.round(day.low_f) : null,
        avg: day.avg_f != null ? Math.round(day.avg_f) : null,
        precip: day.precipitation_total_inches ?? 0,
        frost: day.frost_occurred,
      }));
  }, [dailySummary]);

  const selected = chartData.find((d) => d.date === selectedDate);

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={chartData}
          onClick={(e) => {
            if (e?.activeLabel) {
              const point = chartData.find((d) => d.shortLabel === e.activeLabel);
              if (point) setSelectedDate(point.date === selectedDate ? null : point.date);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="shortLabel" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} unit="°" />
          <RechartsTooltip
            contentStyle={{ fontSize: 12 }}
            labelFormatter={(label) => {
              const point = chartData.find((d) => d.shortLabel === label);
              return point?.label ?? label;
            }}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = { high: 'High', low: 'Low', avg: 'Average' };
              return [`${value}°F`, labels[name] ?? name];
            }}
          />
          <Legend
            formatter={(value: string) => {
              const labels: Record<string, string> = { high: 'High', low: 'Low', avg: 'Average' };
              return labels[value] ?? value;
            }}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Area type="monotone" dataKey="high" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={2} />
          <Area type="monotone" dataKey="avg" stroke="#f59e0b" fill="none" strokeWidth={1} strokeDasharray="4 4" />
          <Area type="monotone" dataKey="low" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>

      {chartData.some((d) => d.precip > 0) && (
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="shortLabel" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit='"' />
            <RechartsTooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(value: number) => [`${value.toFixed(2)}"`, 'Precipitation']}
            />
            <Bar dataKey="precip" fill="#3b82f6" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {selected && (
        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">{selected.label}</h4>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setSelectedDate(null)}>
              Close
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {selected.high != null && (
              <div>
                <span className="text-xs text-muted-foreground">High</span>
                <p className="font-medium text-red-500">{selected.high}°F</p>
              </div>
            )}
            {selected.low != null && (
              <div>
                <span className="text-xs text-muted-foreground">Low</span>
                <p className="font-medium text-blue-500">{selected.low}°F</p>
              </div>
            )}
            {selected.avg != null && (
              <div>
                <span className="text-xs text-muted-foreground">Average</span>
                <p className="font-medium">{selected.avg}°F</p>
              </div>
            )}
            {selected.precip > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Precipitation</span>
                <p className="font-medium text-blue-500">{selected.precip.toFixed(2)}"</p>
              </div>
            )}
            {selected.frost && (
              <div className="flex items-center gap-1 text-destructive text-xs">
                <AlertTriangle className="w-3 h-3" />
                Frost occurred
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-1">
        {chartData.map((day) => (
          <button
            key={day.date}
            onClick={() => setSelectedDate(day.date === selectedDate ? null : day.date)}
            className={`w-full flex items-center justify-between py-2 px-3 rounded-lg text-sm transition-colors text-left ${
              day.date === selectedDate ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'
            }`}
          >
            <span className="text-muted-foreground w-32">{day.label}</span>
            <div className="flex items-center gap-4">
              {day.high != null && day.low != null && (
                <span>
                  <span className="font-medium">{day.high}°</span>
                  <span className="text-muted-foreground ml-1">{day.low}°</span>
                </span>
              )}
              {day.precip > 0 && (
                <span className="text-blue-500 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5" />
                  {day.precip.toFixed(2)}"
                </span>
              )}
              {day.frost && (
                <span className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Frost
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function WeatherPage() {
  const navigate = useNavigate();
  const { data: statusData } = useWeatherStatus();
  const { data: currentData, isLoading: currentLoading } = useCurrentWeather();
  const { data: forecastData } = useForecast();
  const { data: alertsData } = useNwsAlerts();
  const { data: locationData } = useWeatherLocation();

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const { data: summaryData } = useWeatherDailySummary(weekAgo, today);

  const todayDate = new Date().toISOString().split('T')[0];
  const [expandedDay, setExpandedDay] = useState<string | null>(todayDate);

  const configured = statusData?.data?.configured;
  const weather = currentData?.data;
  const forecast = forecastData?.data ?? [];
  const dailyForecast = useMemo(() => groupForecastByDay(forecast), [forecast]);
  const dailySummary = summaryData?.data ?? [];
  const alerts = alertsData?.data?.alerts ?? [];
  const locationName = alertsData?.data?.headline;
  const location = locationData?.data;

  const frostRisk = forecast.some((item) => item.temperature_f <= 32);

  // Today's hourly entries from forecast
  const todayEntries = dailyForecast.length > 0 ? dailyForecast[0].entries : [];

  if (!configured) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Dashboard
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <Cloud className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Weather Not Configured</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Set your OpenWeather API key in Settings to enable weather tracking.
            </p>
            <Button onClick={() => navigate('/settings')}>Go to Settings</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Dashboard
        </Button>
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-muted rounded-lg" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  const updatedAgo = weather?.timestamp
    ? formatDistanceToNow(new Date(weather.timestamp), { addSuffix: true })
    : null;

  const lat = location?.latitude;
  const lon = location?.longitude;
  const zoom = 8;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Nav ── */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Dashboard
          </Button>
          {updatedAgo && (
            <span className="text-xs text-muted-foreground">Updated {updatedAgo}</span>
          )}
        </div>

        {/* ── Alert pills ── */}
        {(frostRisk || alerts.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {frostRisk && (
              <div className="inline-flex items-center gap-1.5 bg-destructive/10 text-destructive rounded-full px-3 py-1 text-xs font-medium">
                <AlertTriangle className="w-3 h-3" />
                Frost risk ahead
              </div>
            )}
            {alerts.map((alert, i) => {
              const color =
                alert.severity === 'Extreme' || alert.severity === 'Severe'
                  ? 'bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-300'
                  : 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-300';
              return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium cursor-help ${color}`}>
                      <AlertTriangle className="w-3 h-3" />
                      {alert.event}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-xs font-medium">{alert.headline}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.severity} — {alert.sender}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}

        {/* ── Hero: Current Weather ── */}
        {weather && (
          <div className="text-center py-4">
            {locationName && (
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mb-2">
                <MapPin className="w-3.5 h-3.5" />
                {locationName}
                {location?.usda_zone && (
                  <span className="ml-1.5 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full">
                    Zone {location.usda_zone}
                  </span>
                )}
              </p>
            )}
            <div className="text-7xl sm:text-8xl font-extralight tracking-tight">
              {weather.temperature_f != null ? `${Math.round(weather.temperature_f)}°` : '--'}
            </div>
            {weather.feels_like_f != null && weather.feels_like_f !== weather.temperature_f && (
              <p className="text-sm text-muted-foreground mt-1">
                Feels like {Math.round(weather.feels_like_f)}°
              </p>
            )}
            {dailyForecast.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                H:{dailyForecast[0].high}° L:{dailyForecast[0].low}°
              </p>
            )}
          </div>
        )}

        {/* ── Hourly scroll (today) ── */}
        {todayEntries.length > 0 && (
          <Card>
            <CardContent className="pt-4 pb-2">
              <HourlyStrip entries={todayEntries} />
            </CardContent>
          </Card>
        )}

        {/* ── 5-Day Forecast (compact rows, expandable) ── */}
        {dailyForecast.length > 0 && (
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                5-Day Forecast
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {dailyForecast.map((day) => (
                <ForecastDayRow
                  key={day.date}
                  day={day}
                  isExpanded={expandedDay === day.date}
                  onToggle={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── Radar Map (hero, full width) ── */}
        {lat && lon && (
          <WeatherMapCard
            title="Live Radar"
            iframeSrc={`https://www.rainviewer.com/map.html?loc=${lat},${lon},${zoom}&oFa=1&oC=1&oU=0&oCS=1&oF=0&oAP=1&c=1&o=83&lm=1&layer=radar&sm=1&sn=1`}
            fullUrl={`https://www.rainviewer.com/map.html?loc=${lat},${lon},${zoom}&oFa=1&oC=1&oU=0&oCS=1&oF=0&oAP=1&c=1&o=83&lm=1&layer=radar&sm=1&sn=1`}
            className="[&>div:last-of-type]:min-h-[280px] sm:[&>div:last-of-type]:min-h-[340px]"
          />
        )}

        {/* ── Conditions Grid ── */}
        {weather && (
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Conditions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {weather.humidity_pct != null && (
                  <InteractiveDetailItem icon={Droplets} label="Humidity" value={`${Math.round(weather.humidity_pct)}%`} metricKey="humidity" />
                )}
                {weather.wind_speed_mph != null && (
                  <InteractiveDetailItem icon={Wind} label="Wind" value={`${weather.wind_speed_mph} mph ${weather.wind_direction ?? ''}`} metricKey="wind" />
                )}
                {weather.cloud_cover_pct != null && (
                  <InteractiveDetailItem icon={CloudSun} label="Cloud Cover" value={`${Math.round(weather.cloud_cover_pct)}%`} metricKey="cloudCover" />
                )}
                {weather.uv_index != null && (
                  <InteractiveDetailItem icon={Sun} label="UV Index" value={String(weather.uv_index)} metricKey="uvIndex" />
                )}
                {weather.pressure_inhg != null && (
                  <InteractiveDetailItem icon={Gauge} label="Pressure" value={`${weather.pressure_inhg} inHg`} metricKey="pressure" />
                )}
                {weather.precipitation_inches != null && weather.precipitation_inches > 0 && (
                  <InteractiveDetailItem icon={CloudRain} label="Precipitation" value={`${weather.precipitation_inches}" ${weather.precipitation_type}`} metricKey="precipitation" />
                )}
                {weather.sunrise && (
                  <InteractiveDetailItem icon={Sunrise} label="Sunrise" value={format(new Date(weather.sunrise), 'h:mm a')} metricKey="sunrise" />
                )}
                {weather.sunset && (
                  <InteractiveDetailItem icon={Sunset} label="Sunset" value={format(new Date(weather.sunset), 'h:mm a')} metricKey="sunset" />
                )}
                {weather.day_length_hours != null && (
                  <InteractiveDetailItem icon={Eye} label="Day Length" value={`${weather.day_length_hours.toFixed(1)} hrs`} metricKey="dayLength" />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Weather Maps (bento layout) ── */}
        {lat && lon && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3 px-1">
              Weather Maps
            </h3>
            <div className="grid grid-cols-2 gap-3 auto-rows-[200px]">
              {/* Temperature — tall left */}
              <WeatherMapCard
                title="Temperature"
                iframeSrc={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=in&metricTemp=°F&metricWind=mph&zoom=${zoom}&overlay=temp&product=ecmwf&level=surface&lat=${lat}&lon=${lon}`}
                fullUrl={`https://www.windy.com/${lat}/${lon}?temp,${lat},${lon},${zoom}`}
                className="row-span-2 [&>div:last-of-type]:min-h-0"
              />
              {/* Wind — top right */}
              <WeatherMapCard
                title="Wind"
                iframeSrc={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=in&metricTemp=°F&metricWind=mph&zoom=${zoom}&overlay=wind&product=ecmwf&level=surface&lat=${lat}&lon=${lon}`}
                fullUrl={`https://www.windy.com/${lat}/${lon}?wind,${lat},${lon},${zoom}`}
                className="[&>div:last-of-type]:min-h-0"
              />
              {/* Precipitation — bottom right */}
              <WeatherMapCard
                title="Rain"
                iframeSrc={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=in&metricTemp=°F&metricWind=mph&zoom=${zoom}&overlay=rain&product=ecmwf&level=surface&lat=${lat}&lon=${lon}`}
                fullUrl={`https://www.windy.com/${lat}/${lon}?rain,${lat},${lon},${zoom}`}
                className="[&>div:last-of-type]:min-h-0"
              />
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <a
                href={`https://forecast.weather.gov/MapClick.php?lat=${lat}&lon=${lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2.5 py-1.5 rounded-lg"
              >
                NWS Forecast
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href={`https://www.drought.gov/current-conditions?lat=${lat}&lon=${lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2.5 py-1.5 rounded-lg"
              >
                Drought Monitor
                <ExternalLink className="w-3 h-3" />
              </a>
              {location?.usda_zone && (
                <a
                  href="https://planthardiness.ars.usda.gov/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-2.5 py-1.5 rounded-lg"
                >
                  USDA Zone Map
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* ── Past 7 Days ── */}
        {dailySummary.length > 0 && (
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Past 7 Days
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              <HistoryChart dailySummary={dailySummary} />
            </CardContent>
          </Card>
        )}

        {/* ── No alerts message ── */}
        {alerts.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
            <ShieldAlert className="w-4 h-4 text-green-500" />
            No active weather alerts for your area
          </div>
        )}

      </div>
    </TooltipProvider>
  );
}
