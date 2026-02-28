import { z } from 'zod';
import { PlantTypeEnum, PlantLifecycleEnum, SunExposureEnum, WaterNeedsEnum, EntityTypeEnum, HistoryActionEnum } from '../schemas/enums.js';

export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export const PlantCatalogSearchParamsSchema = PaginationParamsSchema.extend({
  search: z.string().optional(),
  plant_type: PlantTypeEnum.optional(),
  lifecycle: PlantLifecycleEnum.optional(),
  sun_exposure: SunExposureEnum.optional(),
  water_needs: WaterNeedsEnum.optional(),
  min_zone: z.coerce.number().int().optional(),
  max_zone: z.coerce.number().int().optional(),
});

export const HistoryLogParamsSchema = PaginationParamsSchema.extend({
  entity_type: EntityTypeEnum.optional(),
  entity_id: z.string().uuid().optional(),
  action: HistoryActionEnum.optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;
export type PlantCatalogSearchParams = z.infer<typeof PlantCatalogSearchParamsSchema>;
export type HistoryLogParams = z.infer<typeof HistoryLogParamsSchema>;
