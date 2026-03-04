import { z } from 'zod';
import { BaseEntitySchema } from './common.js';
import { PestCategoryEnum, SpreadRateEnum, DamageTypeEnum } from './enums.js';

export const TreatmentEntrySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  application: z.string().optional(),
  timing: z.string().optional(),
});

export const PestCatalogCreateSchema = z.object({
  // Identification
  common_name: z.string().min(1).max(100),
  scientific_name: z.string().max(200).optional(),
  category: PestCategoryEnum,
  subcategory: z.string().max(100).optional(),
  description: z.string().max(2000).optional(),
  emoji: z.string().max(4).optional(),
  image_url: z.string().url().optional(),

  // Identification details
  appearance: z.array(z.string()).optional(),
  symptoms: z.array(z.string()).optional(),
  life_cycle: z.string().max(1000).optional(),

  // Affected plants
  affected_plants: z.array(z.string()).optional(),
  favorable_conditions: z.array(z.string()).optional(),

  // Geographic info
  min_zone: z.number().int().min(1).max(13).optional(),
  max_zone: z.number().int().min(1).max(13).optional(),
  seasonality: z.string().max(200).optional(),

  // Severity info
  severity_potential: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  spread_rate: SpreadRateEnum.optional(),
  damage_type: DamageTypeEnum.optional(),

  // Prevention
  prevention: z.array(z.string()).optional(),

  // Treatments
  organic_treatments: z.array(z.union([z.string(), TreatmentEntrySchema])).optional(),
  chemical_treatments: z.array(z.union([z.string(), TreatmentEntrySchema])).optional(),
  biological_treatments: z.array(z.union([z.string(), TreatmentEntrySchema])).optional(),
  cultural_treatments: z.array(z.union([z.string(), TreatmentEntrySchema])).optional(),
});

export const PestCatalogUpdateSchema = PestCatalogCreateSchema.partial();

export const PestCatalogSchema = BaseEntitySchema.merge(PestCatalogCreateSchema).extend({
  is_custom: z.number().optional(),
});

export type PestCatalog = z.infer<typeof PestCatalogSchema>;
export type PestCatalogCreate = z.infer<typeof PestCatalogCreateSchema>;
export type PestCatalogUpdate = z.infer<typeof PestCatalogUpdateSchema>;
export type TreatmentEntry = z.infer<typeof TreatmentEntrySchema>;
