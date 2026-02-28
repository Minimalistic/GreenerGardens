import { z } from 'zod';
import { BaseEntitySchema } from './common.js';

export const GridPositionSchema = z.object({
  row: z.number().int().nonnegative(),
  col: z.number().int().nonnegative(),
});

export const SubPlotCreateSchema = z.object({
  plot_id: z.string().uuid(),
  grid_position: GridPositionSchema,
  plant_instance_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(500).optional(),
});

export const SubPlotUpdateSchema = z.object({
  plant_instance_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(500).optional(),
});

export const SubPlotSchema = BaseEntitySchema.merge(SubPlotCreateSchema);

export type GridPosition = z.infer<typeof GridPositionSchema>;
export type SubPlot = z.infer<typeof SubPlotSchema>;
export type SubPlotCreate = z.infer<typeof SubPlotCreateSchema>;
export type SubPlotUpdate = z.infer<typeof SubPlotUpdateSchema>;
