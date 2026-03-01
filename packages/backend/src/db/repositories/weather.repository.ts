import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository.js';

export interface WeatherReadingRow {
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
  dew_point_f: number | null;
  pressure_inhg: number | null;
  sunrise: string | null;
  sunset: string | null;
  day_length_hours: number | null;
  gdd_base50: number | null;
  raw_api_response: string | null;
  created_at: string;
}

export interface WeatherDailySummaryRow {
  id: string;
  garden_id: string;
  date: string;
  high_f: number | null;
  low_f: number | null;
  avg_f: number | null;
  precipitation_total_inches: number | null;
  gdd_accumulated: number | null;
  frost_occurred: number;
  freeze_occurred: number;
  notes: string | null;
  created_at: string;
}

export class WeatherReadingRepository extends BaseRepository<WeatherReadingRow> {
  constructor(db: Database.Database) {
    super(db, 'weather_readings');
  }

  getLatestReading(gardenId: string): WeatherReadingRow | undefined {
    return this.db.prepare(
      'SELECT * FROM weather_readings WHERE garden_id = ? ORDER BY timestamp DESC LIMIT 1'
    ).get(gardenId) as WeatherReadingRow | undefined;
  }

  getReadingsByDateRange(gardenId: string, startDate: string, endDate: string): WeatherReadingRow[] {
    return this.db.prepare(
      'SELECT * FROM weather_readings WHERE garden_id = ? AND timestamp BETWEEN ? AND ? ORDER BY timestamp DESC'
    ).all(gardenId, startDate, endDate) as WeatherReadingRow[];
  }
}

export class WeatherDailySummaryRepository extends BaseRepository<WeatherDailySummaryRow> {
  constructor(db: Database.Database) {
    super(db, 'weather_daily_summary');
  }

  findByGardenAndDate(gardenId: string, date: string): WeatherDailySummaryRow | undefined {
    return this.db.prepare(
      'SELECT * FROM weather_daily_summary WHERE garden_id = ? AND date = ?'
    ).get(gardenId, date) as WeatherDailySummaryRow | undefined;
  }

  getDailySummaries(gardenId: string, startDate: string, endDate: string): WeatherDailySummaryRow[] {
    return this.db.prepare(
      'SELECT * FROM weather_daily_summary WHERE garden_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC'
    ).all(gardenId, startDate, endDate) as WeatherDailySummaryRow[];
  }
}
