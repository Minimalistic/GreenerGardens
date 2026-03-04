import type { PlantStatus, PlantHealth, PlantingMethod } from './schemas/enums.js';

/** Ordered list of plant statuses for UI display and progression tracking. */
export const PLANT_STATUS_ORDER: PlantStatus[] = [
  'planned', 'seed_started', 'germinated', 'seedling', 'hardening_off',
  'transplanted', 'vegetative', 'flowering', 'fruiting', 'harvesting',
  'finished', 'failed', 'removed',
];

/** Plant health options for UI display. */
export const PLANT_HEALTH_OPTIONS: PlantHealth[] = [
  'excellent', 'good', 'fair', 'poor', 'critical', 'dead',
];

/** Available planting methods. */
export const PLANTING_METHODS: PlantingMethod[] = [
  'direct_seed', 'transplant', 'cutting', 'division',
];

/** Status options constrained by planting method. */
export const STATUSES_BY_METHOD: Record<string, PlantStatus[]> = {
  direct_seed: ['planned', 'seed_started', 'germinated', 'seedling'],
  transplant: ['planned', 'seedling', 'hardening_off', 'transplanted', 'vegetative', 'flowering', 'fruiting'],
  cutting: ['planned', 'vegetative'],
  division: ['planned', 'vegetative'],
  layering: ['planned', 'vegetative'],
  grafting: ['planned', 'vegetative'],
};

/** Default initial status for each planting method. */
export const DEFAULT_STATUS_FOR_METHOD: Record<string, PlantStatus> = {
  direct_seed: 'seed_started',
  transplant: 'transplanted',
  cutting: 'vegetative',
  division: 'vegetative',
  layering: 'vegetative',
  grafting: 'vegetative',
};

/** Reverse mapping: status -> required planting method. */
export const METHOD_FOR_STATUS: Record<string, PlantingMethod> = {
  seed_started: 'direct_seed',
  germinated: 'direct_seed',
  hardening_off: 'transplant',
  transplanted: 'transplant',
};
