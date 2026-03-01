import { z } from 'zod';
import { BaseEntitySchema } from './common.js';
import { MoistureLevelEnum } from './enums.js';

export const SoilTestCreateSchema = z.object({
  plot_id: z.string().uuid(),
  test_date: z.string().min(1),
  ph: z.number().min(0).max(14).nullable().optional(),
  nitrogen_ppm: z.number().min(0).nullable().optional(),
  phosphorus_ppm: z.number().min(0).nullable().optional(),
  potassium_ppm: z.number().min(0).nullable().optional(),
  organic_matter_pct: z.number().min(0).max(100).nullable().optional(),
  calcium_ppm: z.number().min(0).nullable().optional(),
  magnesium_ppm: z.number().min(0).nullable().optional(),
  moisture_level: MoistureLevelEnum.nullable().optional(),
  amendments_applied: z.array(z.string()).default([]),
  lab_name: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const SoilTestUpdateSchema = SoilTestCreateSchema.partial();

export const SoilTestSchema = BaseEntitySchema.merge(SoilTestCreateSchema);

export type SoilTest = z.infer<typeof SoilTestSchema>;
export type SoilTestCreate = z.infer<typeof SoilTestCreateSchema>;
export type SoilTestUpdate = z.infer<typeof SoilTestUpdateSchema>;
