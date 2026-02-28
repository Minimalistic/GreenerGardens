import { z } from 'zod';
import { BaseEntitySchema } from './common.js';
import { PlantStatusEnum, PlantHealthEnum, PlantingMethodEnum } from './enums.js';

export const PlantInstanceCreateSchema = z.object({
  plant_catalog_id: z.string().uuid(),
  plot_id: z.string().uuid(),
  sub_plot_id: z.string().uuid().nullable().optional(),
  variety_name: z.string().max(100).optional(),
  status: PlantStatusEnum.default('planned'),
  health: PlantHealthEnum.default('good'),
  planting_method: PlantingMethodEnum.optional(),
  date_planted: z.string().optional(),
  date_germinated: z.string().optional(),
  date_transplanted: z.string().optional(),
  date_first_harvest: z.string().optional(),
  date_finished: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  source: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export const PlantInstanceUpdateSchema = PlantInstanceCreateSchema
  .omit({ plant_catalog_id: true, plot_id: true })
  .partial();

export const PlantInstanceStatusUpdateSchema = z.object({
  status: PlantStatusEnum,
});

export const PlantInstanceHealthUpdateSchema = z.object({
  health: PlantHealthEnum,
});

export const PlantInstanceSchema = BaseEntitySchema.merge(PlantInstanceCreateSchema);

export type PlantInstance = z.infer<typeof PlantInstanceSchema>;
export type PlantInstanceCreate = z.infer<typeof PlantInstanceCreateSchema>;
export type PlantInstanceUpdate = z.infer<typeof PlantInstanceUpdateSchema>;
