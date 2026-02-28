import { z } from 'zod';
import { BaseEntitySchema } from './common.js';

export const GardenCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  address: z.string().max(200).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  usda_zone: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  last_frost_date: z.string().optional(),
  first_frost_date: z.string().optional(),
});

export const GardenUpdateSchema = GardenCreateSchema.partial();

export const GardenSchema = BaseEntitySchema.merge(GardenCreateSchema.required({ name: true }));

export type Garden = z.infer<typeof GardenSchema>;
export type GardenCreate = z.infer<typeof GardenCreateSchema>;
export type GardenUpdate = z.infer<typeof GardenUpdateSchema>;
