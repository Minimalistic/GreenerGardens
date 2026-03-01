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
  'germinated',
  'seedling',
  'hardening_off',
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
  'task',
  'weather_reading',
]);
export type EntityType = z.infer<typeof EntityTypeEnum>;

export const TaskTypeEnum = z.enum([
  'watering',
  'fertilizing',
  'pruning',
  'harvesting',
  'planting',
  'transplanting',
  'pest_control',
  'weeding',
  'soil_prep',
  'seed_starting',
  'hardening_off',
  'other',
]);
export type TaskType = z.infer<typeof TaskTypeEnum>;

export const TaskPriorityEnum = z.enum([
  'low',
  'medium',
  'high',
  'urgent',
]);
export type TaskPriority = z.infer<typeof TaskPriorityEnum>;

export const TaskStatusEnum = z.enum([
  'pending',
  'in_progress',
  'completed',
  'skipped',
  'cancelled',
]);
export type TaskStatus = z.infer<typeof TaskStatusEnum>;

export const WeatherSourceEnum = z.enum([
  'api_current',
  'api_forecast',
  'manual',
]);
export type WeatherSource = z.infer<typeof WeatherSourceEnum>;

export const PrecipitationTypeEnum = z.enum([
  'none',
  'rain',
  'snow',
  'sleet',
  'hail',
  'drizzle',
]);
export type PrecipitationType = z.infer<typeof PrecipitationTypeEnum>;

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
