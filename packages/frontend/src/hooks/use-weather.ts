import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useGardenContext } from '@/contexts/garden-context';

interface WeatherReading {
  id: string;
  garden_id: string;
  timestamp: string;
  source: string;
  temperature_f: number | null;
  feels_like_f: number | null;
  humidity_pct: number | null;
  wind_speed_mph: number | null;
  wind_direction: string | null;
  precipitation_inches: number | null;
  precipitation_type: string;
  cloud_cover_pct: number | null;
  uv_index: number | null;
  pressure_inhg: number | null;
  sunrise: string | null;
  sunset: string | null;
  day_length_hours: number | null;
}

interface ForecastItem {
  timestamp: string;
  dt_txt: string;
  temperature_f: number;
  feels_like_f: number;
  temp_min_f: number;
  temp_max_f: number;
  humidity_pct: number;
  wind_speed_mph: number;
  cloud_cover_pct: number;
  precipitation_inches: number;
  precipitation_probability: number;
  weather_main: string;
  weather_description: string;
  weather_icon: string;
}

interface WeatherStatusResponse {
  success: boolean;
  data: { configured: boolean };
}

interface CurrentWeatherResponse {
  success: boolean;
  configured?: boolean;
  data: WeatherReading | null;
  cached?: boolean;
  error?: string;
}

interface ForecastResponse {
  success: boolean;
  configured?: boolean;
  data: ForecastItem[];
  error?: string;
}

export function useWeatherStatus() {
  return useQuery({
    queryKey: ['weather-status'],
    queryFn: () => api.get<WeatherStatusResponse>('/weather/status'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCurrentWeather() {
  const { currentGardenId } = useGardenContext();
  return useQuery({
    queryKey: ['weather', 'current', currentGardenId],
    queryFn: () => api.get<CurrentWeatherResponse>(`/weather/current?garden_id=${currentGardenId}`),
    enabled: !!currentGardenId,
    refetchInterval: 30 * 60 * 1000,
    staleTime: 15 * 60 * 1000,
  });
}

export function useForecast() {
  const { currentGardenId } = useGardenContext();
  return useQuery({
    queryKey: ['weather', 'forecast', currentGardenId],
    queryFn: () => api.get<ForecastResponse>(`/weather/forecast?garden_id=${currentGardenId}`),
    enabled: !!currentGardenId,
    refetchInterval: 2 * 60 * 60 * 1000,
    staleTime: 60 * 60 * 1000,
  });
}

export type { WeatherReading, ForecastItem };
