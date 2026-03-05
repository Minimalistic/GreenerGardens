import { z } from 'zod';
import { BaseEntitySchema } from './common.js';

export const GardenObjectTypeEnum = z.enum([
  'house',
  'shed',
  'greenhouse',
  'chicken_coop',
  'fence',
  'tree',
  'path',
  'driveway',
  'pond',
  'compost',
  'patio',
  'deck',
  'other',
]);

export const GardenObjectGeometrySchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  rotation: z.number().default(0),
});

export const GardenObjectCreateSchema = z.object({
  garden_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  object_type: GardenObjectTypeEnum.default('other'),
  geometry: GardenObjectGeometrySchema.optional(),
  color: z.string().max(30).optional(),
  opacity: z.number().min(0).max(1).optional().default(0.7),
  label_visible: z.boolean().optional().default(true),
  z_index: z.number().int().optional().default(0),
});

export const GardenObjectUpdateSchema = GardenObjectCreateSchema.omit({ garden_id: true }).partial();

export const GardenObjectSchema = BaseEntitySchema.merge(
  GardenObjectCreateSchema.required({ name: true, garden_id: true }),
).extend({
  geometry: GardenObjectGeometrySchema,
});

export type GardenObject = z.infer<typeof GardenObjectSchema>;
export type GardenObjectCreate = z.input<typeof GardenObjectCreateSchema>;
export type GardenObjectUpdate = z.input<typeof GardenObjectUpdateSchema>;
export type GardenObjectGeometry = z.infer<typeof GardenObjectGeometrySchema>;
export type GardenObjectType = z.infer<typeof GardenObjectTypeEnum>;
