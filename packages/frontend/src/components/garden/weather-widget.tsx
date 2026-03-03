import { useNavigate } from 'react-router-dom';
import { Cloud, CloudRain, CloudSnow, Droplets, Sun, Thermometer, Wind, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCurrentWeather, useForecast, useWeatherStatus } from '@/hooks/use-weather';
import type { ForecastItem } from '@/hooks/use-weather';
import { formatDistanceToNow } from 'date-fns';

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

function groupForecastByDay(items: ForecastItem[]): Array<{ date: string; high: number; low: number; icon: string; main: string }> {
  const days = new Map<string, { temps: number[]; icon: string; main: string }>();
  for (const item of items) {
    const date = item.dt_txt.split(' ')[0];
    if (!days.has(date)) {
      days.set(date, { temps: [], icon: item.weather_icon, main: item.weather_main });
    }
    days.get(date)!.temps.push(item.temperature_f);
  }

  return Array.from(days.entries())
    .slice(0, 5)
    .map(([date, { temps, icon, main }]) => ({
      date,
      high: Math.round(Math.max(...temps)),
      low: Math.round(Math.min(...temps)),
      icon,
      main,
    }));
}

function hasFrostRisk(items: ForecastItem[]): boolean {
  return items.some(item => item.temperature_f <= 32);
}

export function WeatherWidget() {
  const navigate = useNavigate();
  const { data: statusData } = useWeatherStatus();
  const { data: currentData, isLoading: currentLoading } = useCurrentWeather();
  const { data: forecastData } = useForecast();

  const configured = statusData?.data?.configured;
  const weather = currentData?.data;
  const forecast = forecastData?.data ?? [];
  const frostRisk = hasFrostRisk(forecast);
  const dailyForecast = groupForecastByDay(forecast);

  if (!configured) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Set your OpenWeather API key in the .env file to enable weather tracking.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (currentLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-muted rounded w-24" />
            <div className="h-4 bg-muted rounded w-40" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No weather data yet. Make sure your garden has coordinates set in Settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  const updatedAgo = weather.timestamp
    ? formatDistanceToNow(new Date(weather.timestamp), { addSuffix: true })
    : 'unknown';

  return (
    <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/weather')}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="w-5 h-5" />
            Weather
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/weather'); }}>Details</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {frostRisk && (
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            Frost risk in the forecast — protect tender plants!
          </div>
        )}

        <div className="flex items-center gap-6">
          <div>
            <div className="text-3xl font-bold">
              {weather.temperature_f != null ? `${Math.round(weather.temperature_f)}°F` : '--'}
            </div>
            {weather.feels_like_f != null && (
              <div className="text-xs text-muted-foreground">
                Feels like {Math.round(weather.feels_like_f)}°F
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {weather.humidity_pct != null && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Droplets className="w-3.5 h-3.5" />
                {Math.round(weather.humidity_pct)}%
              </div>
            )}
            {weather.wind_speed_mph != null && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Wind className="w-3.5 h-3.5" />
                {weather.wind_speed_mph} mph {weather.wind_direction ?? ''}
              </div>
            )}
          </div>
        </div>

        {dailyForecast.length > 0 && (
          <div className="border-t pt-3">
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              {dailyForecast.map(day => (
                <div key={day.date} className="space-y-1">
                  <div className="text-muted-foreground font-medium">
                    {new Date(day.date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' })}
                  </div>
                  <div className="flex justify-center">
                    {getWeatherIcon(day.main, 'w-4 h-4 text-muted-foreground')}
                  </div>
                  <div>
                    <span className="font-medium">{day.high}°</span>
                    <span className="text-muted-foreground ml-1">{day.low}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
