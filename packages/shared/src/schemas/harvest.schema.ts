import { z } from 'zod';
import { BaseEntitySchema } from './common.js';
import { HarvestUnitEnum, HarvestQualityEnum, HarvestDestinationEnum } from './enums.js';

export const HarvestCreateSchema = z.object({
  plant_instance_id: z.string().uuid(),
  plot_id: z.string().uuid(),
  date_harvested: z.string(),
  quantity: z.number().positive(),
  unit: HarvestUnitEnum,
  quality: HarvestQualityEnum.default('good'),
  destination: HarvestDestinationEnum.default('eaten_fresh'),
  weight_oz: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
});

export const HarvestUpdateSchema = HarvestCreateSchema.partial();

export const HarvestSchema = BaseEntitySchema.merge(HarvestCreateSchema);

export type Harvest = z.infer<typeof HarvestSchema>;
export type HarvestCreate = z.infer<typeof HarvestCreateSchema>;
export type HarvestUpdate = z.infer<typeof HarvestUpdateSchema>;
