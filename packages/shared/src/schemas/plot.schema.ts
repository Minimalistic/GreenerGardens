import { z } from 'zod';
import { BaseEntitySchema } from './common.js';
import { PlotTypeEnum, SunExposureEnum, IrrigationTypeEnum } from './enums.js';

export const PlotGeometrySchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().default(0),
});

export const PlotDimensionsSchema = z.object({
  length_ft: z.number().positive(),
  width_ft: z.number().positive(),
  height_ft: z.number().positive().optional(),
});

export const PlotCreateSchema = z.object({
  garden_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  plot_type: PlotTypeEnum,
  dimensions: PlotDimensionsSchema,
  geometry: PlotGeometrySchema.optional(),
  soil_type: z.string().max(100).optional(),
  sun_exposure: SunExposureEnum.optional(),
  irrigation: IrrigationTypeEnum.optional(),
  notes: z.string().max(1000).optional(),
});

export const PlotUpdateSchema = PlotCreateSchema.omit({ garden_id: true }).partial();

export const PlotSchema = BaseEntitySchema.merge(PlotCreateSchema).extend({
  geometry: PlotGeometrySchema,
});

export type PlotGeometry = z.infer<typeof PlotGeometrySchema>;
export type PlotDimensions = z.infer<typeof PlotDimensionsSchema>;
export type Plot = z.infer<typeof PlotSchema>;
export type PlotCreate = z.infer<typeof PlotCreateSchema>;
export type PlotUpdate = z.infer<typeof PlotUpdateSchema>;
