import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import type { WeatherReadingRepository, WeatherDailySummaryRepository } from '../db/repositories/weather.repository.js';
import type { GardenRepository } from '../db/repositories/garden.repository.js';

interface OpenWeatherCurrentResponse {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    temp_min: number;
    temp_max: number;
  };
  wind: { speed: number; deg: number };
  clouds: { all: number };
  weather: Array<{ main: string; description: string; icon: string }>;
  rain?: { '1h'?: number; '3h'?: number };
  snow?: { '1h'?: number; '3h'?: number };
  sys: { sunrise: number; sunset: number };
  dt: number;
}

interface OpenWeatherForecastResponse {
  list: Array<{
    dt: number;
    main: { temp: number; feels_like: number; humidity: number; temp_min: number; temp_max: number };
    wind: { speed: number; deg: number };
    clouds: { all: number };
    weather: Array<{ main: string; description: string; icon: string }>;
    rain?: { '3h'?: number };
    snow?: { '3h'?: number };
    pop: number;
    dt_txt: string;
  }>;
}

function kelvinToFahrenheit(k: number): number {
  return Math.round(((k - 273.15) * 9) / 5 + 32);
}

function mpsToMph(mps: number): number {
  return Math.round(mps * 2.237 * 10) / 10;
}

function hpaToInhg(hpa: number): number {
  return Math.round(hpa * 0.02953 * 100) / 100;
}

function mmToInches(mm: number): number {
  return Math.round(mm * 0.03937 * 100) / 100;
}

function degToDirection(deg: number): string {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

export class WeatherService {
  private apiKey: string | undefined;

  constructor(
    private db: Database.Database,
    private readingRepo: WeatherReadingRepository,
    private summaryRepo: WeatherDailySummaryRepository,
    private gardenRepo: GardenRepository,
  ) {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  getLatestReading(gardenId: string) {
    const reading = this.readingRepo.getLatestReading(gardenId);
    return reading ?? null;
  }

  getReadingsByDateRange(gardenId: string, startDate: string, endDate: string) {
    return this.readingRepo.getReadingsByDateRange(gardenId, startDate, endDate);
  }

  getDailySummaries(gardenId: string, startDate: string, endDate: string) {
    return this.summaryRepo.getDailySummaries(gardenId, startDate, endDate);
  }

  async fetchCurrentWeather(gardenId: string) {
    if (!this.apiKey) {
      return { configured: false, data: this.getLatestReading(gardenId) };
    }

    const garden = this.gardenRepo.findById(gardenId);
    if (!garden || !garden.latitude || !garden.longitude) {
      return { configured: true, data: this.getLatestReading(gardenId), error: 'Garden location not set' };
    }

    // Check staleness — skip fetch if reading is < 30 min old
    const latest = this.getLatestReading(gardenId);
    if (latest) {
      const age = Date.now() - new Date(latest.timestamp).getTime();
      if (age < 30 * 60 * 1000) {
        return { configured: true, data: latest, cached: true };
      }
    }

    try {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${garden.latitude}&lon=${garden.longitude}&appid=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`OpenWeather API returned ${res.status}`);

      const raw: OpenWeatherCurrentResponse = await res.json();
      const reading = this.mapCurrentToReading(gardenId, raw);

      const saved = this.db.transaction(() => {
        return this.readingRepo.insert(reading);
      })();

      return { configured: true, data: saved, cached: false };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { configured: true, data: latest ?? null, error: message, cached: true };
    }
  }

  async fetchForecast(gardenId: string) {
    if (!this.apiKey) {
      return { configured: false, data: [] };
    }

    const garden = this.gardenRepo.findById(gardenId);
    if (!garden || !garden.latitude || !garden.longitude) {
      return { configured: true, data: [], error: 'Garden location not set' };
    }

    try {
      const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${garden.latitude}&lon=${garden.longitude}&appid=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`OpenWeather API returned ${res.status}`);

      const raw: OpenWeatherForecastResponse = await res.json();
      const forecasts = raw.list.map(item => this.mapForecastItem(gardenId, item));

      return { configured: true, data: forecasts };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { configured: true, data: [], error: message };
    }
  }

  computeDailySummary(gardenId: string, date: string) {
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;
    const readings = this.readingRepo.getReadingsByDateRange(gardenId, startOfDay, endOfDay);

    if (readings.length === 0) return null;

    const temps = readings.filter(r => r.temperature_f != null).map(r => r.temperature_f!);
    const high = temps.length > 0 ? Math.max(...temps) : null;
    const low = temps.length > 0 ? Math.min(...temps) : null;
    const avg = temps.length > 0 ? Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10 : null;

    const precip = readings
      .filter(r => r.precipitation_inches != null)
      .reduce((sum, r) => sum + (r.precipitation_inches ?? 0), 0);

    const gdd = high != null && low != null ? Math.max(0, (high + low) / 2 - 50) : null;
    const frost = low != null && low <= 32;
    const freeze = low != null && low <= 28;

    const existing = this.summaryRepo.findByGardenAndDate(gardenId, date);

    const summaryData = {
      garden_id: gardenId,
      date,
      high_f: high,
      low_f: low,
      avg_f: avg,
      precipitation_total_inches: Math.round(precip * 100) / 100,
      gdd_accumulated: gdd != null ? Math.round(gdd * 10) / 10 : null,
      frost_occurred: frost ? 1 : 0,
      freeze_occurred: freeze ? 1 : 0,
    };

    if (existing) {
      return this.summaryRepo.update(existing.id, summaryData);
    } else {
      return this.summaryRepo.insert({ id: uuid(), ...summaryData });
    }
  }

  private mapCurrentToReading(gardenId: string, raw: OpenWeatherCurrentResponse) {
    const precipInches = raw.rain?.['1h']
      ? mmToInches(raw.rain['1h'])
      : raw.snow?.['1h']
      ? mmToInches(raw.snow['1h'])
      : 0;

    const precipType = raw.snow ? 'snow' : raw.rain ? 'rain' : 'none';

    const sunrise = new Date(raw.sys.sunrise * 1000).toISOString();
    const sunset = new Date(raw.sys.sunset * 1000).toISOString();
    const dayLengthHours = Math.round(((raw.sys.sunset - raw.sys.sunrise) / 3600) * 10) / 10;

    return {
      id: uuid(),
      garden_id: gardenId,
      timestamp: new Date(raw.dt * 1000).toISOString(),
      source: 'api_current',
      temperature_f: kelvinToFahrenheit(raw.main.temp),
      feels_like_f: kelvinToFahrenheit(raw.main.feels_like),
      humidity_pct: raw.main.humidity,
      wind_speed_mph: mpsToMph(raw.wind.speed),
      wind_direction: degToDirection(raw.wind.deg),
      precipitation_inches: precipInches,
      precipitation_type: precipType,
      cloud_cover_pct: raw.clouds.all,
      dew_point_f: null,
      uv_index: null,
      pressure_inhg: hpaToInhg(raw.main.pressure),
      sunrise,
      sunset,
      day_length_hours: dayLengthHours,
      gdd_base50: null,
      raw_api_response: JSON.stringify(raw),
    };
  }

  async fetchNwsAlerts(gardenId: string) {
    const garden = this.gardenRepo.findById(gardenId);
    if (!garden || !garden.latitude || !garden.longitude) {
      return { alerts: [], headline: null, error: 'Garden location not set' };
    }

    try {
      // NWS alerts by lat/lon — free, no API key
      const alertsUrl = `https://api.weather.gov/alerts/active?point=${garden.latitude},${garden.longitude}`;
      const alertsRes = await fetch(alertsUrl, {
        headers: { 'User-Agent': '(GreenerGardens, gardenvault@local)', Accept: 'application/geo+json' },
      });
      if (!alertsRes.ok) throw new Error(`NWS alerts API returned ${alertsRes.status}`);

      const alertsJson = await alertsRes.json() as {
        features: Array<{
          properties: {
            event: string;
            headline: string;
            description: string;
            severity: string;
            urgency: string;
            onset: string;
            expires: string;
            senderName: string;
          };
        }>;
      };

      const alerts = alertsJson.features.map((f) => ({
        event: f.properties.event,
        headline: f.properties.headline,
        description: f.properties.description,
        severity: f.properties.severity,
        urgency: f.properties.urgency,
        onset: f.properties.onset,
        expires: f.properties.expires,
        sender: f.properties.senderName,
      }));

      // Reverse geocode via Nominatim for accurate city name
      let headline: string | null = null;
      try {
        const geoUrl = `https://nominatim.openstreetmap.org/reverse?lat=${garden.latitude}&lon=${garden.longitude}&format=json&addressdetails=1&zoom=12`;
        const geoRes = await fetch(geoUrl, {
          headers: { 'User-Agent': 'GardenVault/1.0 (weather location)' },
          signal: AbortSignal.timeout(5000),
        });
        if (geoRes.ok) {
          const geoJson = await geoRes.json() as {
            address?: {
              city?: string;
              town?: string;
              village?: string;
              municipality?: string;
              state?: string;
            };
          };
          const addr = geoJson.address;
          const city = addr?.city ?? addr?.town ?? addr?.village ?? addr?.municipality;
          if (city && addr?.state) {
            headline = `${city}, ${addr.state}`;
          }
        }
      } catch {
        // Non-critical — location name is optional
      }

      return { alerts, headline, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { alerts: [], headline: null, error: message };
    }
  }

  getGardenLocation(gardenId: string) {
    const garden = this.gardenRepo.findById(gardenId);
    if (!garden) return null;
    return {
      latitude: garden.latitude ?? null,
      longitude: garden.longitude ?? null,
      address: garden.address ?? null,
      usda_zone: garden.usda_zone ?? null,
    };
  }

  private mapForecastItem(gardenId: string, item: OpenWeatherForecastResponse['list'][0]) {
    const precipInches = item.rain?.['3h']
      ? mmToInches(item.rain['3h'])
      : item.snow?.['3h']
      ? mmToInches(item.snow['3h'])
      : 0;

    return {
      timestamp: new Date(item.dt * 1000).toISOString(),
      dt_txt: item.dt_txt,
      temperature_f: kelvinToFahrenheit(item.main.temp),
      feels_like_f: kelvinToFahrenheit(item.main.feels_like),
      temp_min_f: kelvinToFahrenheit(item.main.temp_min),
      temp_max_f: kelvinToFahrenheit(item.main.temp_max),
      humidity_pct: item.main.humidity,
      wind_speed_mph: mpsToMph(item.wind.speed),
      cloud_cover_pct: item.clouds.all,
      precipitation_inches: precipInches,
      precipitation_probability: Math.round(item.pop * 100),
      weather_main: item.weather[0]?.main ?? '',
      weather_description: item.weather[0]?.description ?? '',
      weather_icon: item.weather[0]?.icon ?? '',
    };
  }
}
