import { z } from 'zod';
import { WeatherSourceEnum, PrecipitationTypeEnum } from './enums.js';

export const WeatherReadingCreateSchema = z.object({
  garden_id: z.string().uuid(),
  timestamp: z.string(),
  source: WeatherSourceEnum.default('api_current'),
  temperature_f: z.number().nullable().optional(),
  feels_like_f: z.number().nullable().optional(),
  humidity_pct: z.number().min(0).max(100).nullable().optional(),
  wind_speed_mph: z.number().min(0).nullable().optional(),
  wind_direction: z.string().max(10).nullable().optional(),
  precipitation_inches: z.number().min(0).nullable().optional(),
  precipitation_type: PrecipitationTypeEnum.default('none'),
  cloud_cover_pct: z.number().min(0).max(100).nullable().optional(),
  uv_index: z.number().min(0).nullable().optional(),
  dew_point_f: z.number().nullable().optional(),
  pressure_inhg: z.number().nullable().optional(),
  sunrise: z.string().nullable().optional(),
  sunset: z.string().nullable().optional(),
  day_length_hours: z.number().min(0).nullable().optional(),
  gdd_base50: z.number().min(0).nullable().optional(),
  raw_api_response: z.string().nullable().optional(),
});

export const WeatherReadingSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string(),
}).merge(WeatherReadingCreateSchema);

export const WeatherDailySummaryCreateSchema = z.object({
  garden_id: z.string().uuid(),
  date: z.string(),
  high_f: z.number().nullable().optional(),
  low_f: z.number().nullable().optional(),
  avg_f: z.number().nullable().optional(),
  precipitation_total_inches: z.number().min(0).nullable().optional(),
  gdd_accumulated: z.number().min(0).nullable().optional(),
  frost_occurred: z.boolean().default(false),
  freeze_occurred: z.boolean().default(false),
  notes: z.string().max(500).nullable().optional(),
});

export const WeatherDailySummarySchema = z.object({
  id: z.string().uuid(),
  created_at: z.string(),
}).merge(WeatherDailySummaryCreateSchema);

export type WeatherReading = z.infer<typeof WeatherReadingSchema>;
export type WeatherReadingCreate = z.infer<typeof WeatherReadingCreateSchema>;
export type WeatherDailySummary = z.infer<typeof WeatherDailySummarySchema>;
export type WeatherDailySummaryCreate = z.infer<typeof WeatherDailySummaryCreateSchema>;
