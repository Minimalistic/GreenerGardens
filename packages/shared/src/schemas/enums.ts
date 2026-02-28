import { z } from 'zod';

export const PlotTypeEnum = z.enum([
  'raised_bed',
  'in_ground',
  'container',
  'greenhouse',
  'hydroponic',
  'vertical',
  'other',
]);
export type PlotType = z.infer<typeof PlotTypeEnum>;

export const SunExposureEnum = z.enum([
  'full_sun',
  'partial_sun',
  'partial_shade',
  'full_shade',
]);
export type SunExposure = z.infer<typeof SunExposureEnum>;

export const IrrigationTypeEnum = z.enum([
  'drip',
  'sprinkler',
  'hand_watered',
  'soaker_hose',
  'none',
]);
export type IrrigationType = z.infer<typeof IrrigationTypeEnum>;

export const PlantStatusEnum = z.enum([
  'planned',
  'seed_started',
  'seedling',
  'transplanted',
  'vegetative',
  'flowering',
  'fruiting',
  'harvesting',
  'finished',
  'failed',
  'removed',
]);
export type PlantStatus = z.infer<typeof PlantStatusEnum>;

export const PlantingMethodEnum = z.enum([
  'direct_seed',
  'transplant',
  'cutting',
  'division',
  'bulb',
  'bare_root',
  'other',
]);
export type PlantingMethod = z.infer<typeof PlantingMethodEnum>;

export const PlantHealthEnum = z.enum([
  'excellent',
  'good',
  'fair',
  'poor',
  'critical',
  'dead',
]);
export type PlantHealth = z.infer<typeof PlantHealthEnum>;

export const HarvestUnitEnum = z.enum([
  'lb',
  'oz',
  'kg',
  'g',
  'count',
  'bunch',
  'basket',
  'pint',
  'quart',
  'gallon',
]);
export type HarvestUnit = z.infer<typeof HarvestUnitEnum>;

export const HarvestQualityEnum = z.enum([
  'excellent',
  'good',
  'fair',
  'poor',
]);
export type HarvestQuality = z.infer<typeof HarvestQualityEnum>;

export const HarvestDestinationEnum = z.enum([
  'eaten_fresh',
  'cooked',
  'preserved',
  'shared',
  'sold',
  'composted',
  'other',
]);
export type HarvestDestination = z.infer<typeof HarvestDestinationEnum>;

export const HistoryActionEnum = z.enum([
  'create',
  'update',
  'delete',
]);
export type HistoryAction = z.infer<typeof HistoryActionEnum>;

export const EntityTypeEnum = z.enum([
  'garden',
  'plot',
  'sub_plot',
  'plant_instance',
  'harvest',
]);
export type EntityType = z.infer<typeof EntityTypeEnum>;

export const PlantTypeEnum = z.enum([
  'vegetable',
  'fruit',
  'herb',
  'flower',
  'tree',
  'shrub',
  'vine',
  'grass',
  'succulent',
  'other',
]);
export type PlantType = z.infer<typeof PlantTypeEnum>;

export const PlantLifecycleEnum = z.enum([
  'annual',
  'biennial',
  'perennial',
]);
export type PlantLifecycle = z.infer<typeof PlantLifecycleEnum>;

export const WaterNeedsEnum = z.enum([
  'low',
  'moderate',
  'high',
  'very_high',
]);
export type WaterNeeds = z.infer<typeof WaterNeedsEnum>;
