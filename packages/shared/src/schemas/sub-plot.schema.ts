import { z } from 'zod';
import { BaseEntitySchema } from './common.js';
import { PlotGeometrySchema } from './plot.schema.js';

export const GridPositionSchema = z.object({
  row: z.number().int().nonnegative(),
  col: z.number().int().nonnegative(),
});

export const SubPlotCreateSchema = z.object({
  plot_id: z.string().uuid(),
  grid_position: GridPositionSchema.optional().default({ row: 0, col: 0 }),
  geometry: PlotGeometrySchema.optional(),
  plant_instance_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(500).optional(),
});

export const SubPlotUpdateSchema = z.object({
  geometry: PlotGeometrySchema.optional(),
  plant_instance_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(500).optional(),
});

export const SubPlotSchema = BaseEntitySchema.merge(SubPlotCreateSchema).extend({
  geometry: PlotGeometrySchema,
});

export type GridPosition = z.infer<typeof GridPositionSchema>;
export type SubPlot = z.infer<typeof SubPlotSchema>;
export type SubPlotCreate = z.infer<typeof SubPlotCreateSchema>;
export type SubPlotUpdate = z.infer<typeof SubPlotUpdateSchema>;
