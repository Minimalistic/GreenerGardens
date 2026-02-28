import { z } from 'zod';
import { BaseEntitySchema } from './common.js';
import { PlantTypeEnum, PlantLifecycleEnum, SunExposureEnum, WaterNeedsEnum } from './enums.js';

export const PlantCatalogCreateSchema = z.object({
  // Identification
  common_name: z.string().min(1).max(100),
  scientific_name: z.string().max(150).optional(),
  family: z.string().max(100).optional(),
  plant_type: PlantTypeEnum,
  lifecycle: PlantLifecycleEnum.optional(),
  description: z.string().max(1000).optional(),
  image_url: z.string().url().optional(),

  // Growing info
  sun_exposure: SunExposureEnum.optional(),
  water_needs: WaterNeedsEnum.optional(),
  min_zone: z.number().int().min(1).max(13).optional(),
  max_zone: z.number().int().min(1).max(13).optional(),
  soil_ph_min: z.number().min(0).max(14).optional(),
  soil_ph_max: z.number().min(0).max(14).optional(),
  spacing_inches: z.number().positive().optional(),
  row_spacing_inches: z.number().positive().optional(),
  height_inches_min: z.number().positive().optional(),
  height_inches_max: z.number().positive().optional(),

  // Planting info
  days_to_germination_min: z.number().int().positive().optional(),
  days_to_germination_max: z.number().int().positive().optional(),
  days_to_maturity_min: z.number().int().positive().optional(),
  days_to_maturity_max: z.number().int().positive().optional(),
  planting_depth_inches: z.number().positive().optional(),
  indoor_start_weeks_before_frost: z.number().int().optional(),
  outdoor_sow_weeks_after_frost: z.number().int().optional(),

  // Harvest info
  harvest_instructions: z.string().max(500).optional(),
  storage_instructions: z.string().max(500).optional(),

  // Relationships
  companions: z.array(z.string()).optional(),
  antagonists: z.array(z.string()).optional(),
  rotation_family: z.string().max(50).optional(),

  // Tips
  growing_tips: z.array(z.string()).optional(),
});

export const PlantCatalogSchema = BaseEntitySchema.merge(PlantCatalogCreateSchema);

export type PlantCatalog = z.infer<typeof PlantCatalogSchema>;
export type PlantCatalogCreate = z.infer<typeof PlantCatalogCreateSchema>;
