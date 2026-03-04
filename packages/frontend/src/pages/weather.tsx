import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Cloud,
  CloudRain,
  CloudSnow,
  Droplets,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
  AlertTriangle,
  Gauge,
  Eye,
  CloudSun,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useCurrentWeather,
  useForecast,
  useWeatherStatus,
  useWeatherDailySummary,
} from '@/hooks/use-weather';
import type { ForecastItem } from '@/hooks/use-weather';
import { formatDistanceToNow, format, subDays } from 'date-fns';
import { formatWeekdayDate, formatShortWeekdayDate } from '@/lib/format-date';

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

interface DayForecast {
  date: string;
  dayLabel: string;
  high: number;
  low: number;
  main: string;
  entries: ForecastItem[];
}

function groupForecastByDay(items: ForecastItem[]): DayForecast[] {
  const days = new Map<string, { temps: number[]; main: string; entries: ForecastItem[] }>();
  for (const item of items) {
    const date = item.dt_txt.split(' ')[0];
    if (!days.has(date)) {
      days.set(date, { temps: [], main: item.weather_main, entries: [] });
    }
    const day = days.get(date)!;
    day.temps.push(item.temperature_f);
    day.entries.push(item);
  }

  return Array.from(days.entries()).map(([date, { temps, main, entries }]) => ({
    date,
    dayLabel: formatWeekdayDate(date),
    high: Math.round(Math.max(...temps)),
    low: Math.round(Math.min(...temps)),
    main,
    entries,
  }));
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Thermometer;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export function WeatherPage() {
  const navigate = useNavigate();
  const { data: statusData } = useWeatherStatus();
  const { data: currentData, isLoading: currentLoading } = useCurrentWeather();
  const { data: forecastData } = useForecast();

  const today = format(new Date(), 'yyyy-MM-dd');
  const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
  const { data: summaryData } = useWeatherDailySummary(weekAgo, today);

  const configured = statusData?.data?.configured;
  const weather = currentData?.data;
  const forecast = forecastData?.data ?? [];
  const dailyForecast = useMemo(() => groupForecastByDay(forecast), [forecast]);
  const dailySummary = summaryData?.data ?? [];

  const frostRisk = forecast.some((item) => item.temperature_f <= 32);

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Dashboard
        </Button>
        {updatedAgo && (
          <span className="text-xs text-muted-foreground">Updated {updatedAgo}</span>
        )}
      </div>

      {frostRisk && (
        <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm font-medium">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          Frost risk in the forecast — protect tender plants!
        </div>
      )}

      {/* Current Conditions */}
      {weather && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Thermometer className="w-5 h-5" />
              Current Conditions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 mb-6">
              <div>
                <div className="text-5xl font-bold">
                  {weather.temperature_f != null
                    ? `${Math.round(weather.temperature_f)}°F`
                    : '--'}
                </div>
                {weather.feels_like_f != null && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Feels like {Math.round(weather.feels_like_f)}°F
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {weather.humidity_pct != null && (
                <DetailItem icon={Droplets} label="Humidity" value={`${Math.round(weather.humidity_pct)}%`} />
              )}
              {weather.wind_speed_mph != null && (
                <DetailItem
                  icon={Wind}
                  label="Wind"
                  value={`${weather.wind_speed_mph} mph ${weather.wind_direction ?? ''}`}
                />
              )}
              {weather.cloud_cover_pct != null && (
                <DetailItem icon={CloudSun} label="Cloud Cover" value={`${Math.round(weather.cloud_cover_pct)}%`} />
              )}
              {weather.uv_index != null && (
                <DetailItem icon={Sun} label="UV Index" value={String(weather.uv_index)} />
              )}
              {weather.pressure_inhg != null && (
                <DetailItem icon={Gauge} label="Pressure" value={`${weather.pressure_inhg} inHg`} />
              )}
              {weather.precipitation_inches != null && weather.precipitation_inches > 0 && (
                <DetailItem
                  icon={CloudRain}
                  label="Precipitation"
                  value={`${weather.precipitation_inches}" ${weather.precipitation_type}`}
                />
              )}
              {weather.sunrise && (
                <DetailItem
                  icon={Sunrise}
                  label="Sunrise"
                  value={format(new Date(weather.sunrise), 'h:mm a')}
                />
              )}
              {weather.sunset && (
                <DetailItem
                  icon={Sunset}
                  label="Sunset"
                  value={format(new Date(weather.sunset), 'h:mm a')}
                />
              )}
              {weather.day_length_hours != null && (
                <DetailItem icon={Eye} label="Day Length" value={`${weather.day_length_hours.toFixed(1)} hrs`} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5-Day Forecast */}
      {dailyForecast.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Cloud className="w-5 h-5" />
              5-Day Forecast
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dailyForecast.map((day) => (
              <div key={day.date} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getWeatherIcon(day.main, 'w-6 h-6 text-muted-foreground')}
                    <span className="font-medium">{day.dayLabel}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">{day.high}°</span>
                    <span className="text-muted-foreground ml-2">{day.low}°</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {day.entries.map((entry) => {
                    const time = entry.dt_txt.split(' ')[1].slice(0, 5);
                    const hour = parseInt(time.split(':')[0]);
                    const ampm = hour >= 12 ? 'PM' : 'AM';
                    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                    return (
                      <div
                        key={entry.dt_txt}
                        className="text-center p-2 rounded-md bg-muted/30 text-xs space-y-1"
                      >
                        <div className="text-muted-foreground font-medium">
                          {h12}{ampm}
                        </div>
                        <div className="flex justify-center">
                          {getWeatherIcon(entry.weather_main, 'w-4 h-4 text-muted-foreground')}
                        </div>
                        <div className="font-medium">{Math.round(entry.temperature_f)}°</div>
                        {entry.precipitation_probability > 0 && (
                          <div className="text-blue-500 flex items-center justify-center gap-0.5">
                            <Droplets className="w-3 h-3" />
                            {entry.precipitation_probability}%
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 7-Day History */}
      {dailySummary.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Thermometer className="w-5 h-5" />
              Past 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dailySummary.map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between py-2 border-b last:border-0 text-sm"
                >
                  <span className="text-muted-foreground w-28">
                    {formatShortWeekdayDate(day.date)}
                  </span>
                  <div className="flex items-center gap-4">
                    {day.high_f != null && day.low_f != null && (
                      <span>
                        <span className="font-medium">{Math.round(day.high_f)}°</span>
                        <span className="text-muted-foreground ml-1">{Math.round(day.low_f)}°</span>
                      </span>
                    )}
                    {day.precipitation_total_inches != null && day.precipitation_total_inches > 0 && (
                      <span className="text-blue-500 flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5" />
                        {day.precipitation_total_inches.toFixed(2)}"
                      </span>
                    )}
                    {day.frost_occurred && (
                      <span className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Frost
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
