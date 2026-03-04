export const STATUS_ORDER = [
  'planned', 'seed_started', 'germinated', 'seedling', 'hardening_off',
  'transplanted', 'vegetative', 'flowering', 'fruiting', 'harvesting',
  'finished', 'failed', 'removed',
];

export const HEALTH_OPTIONS = ['excellent', 'good', 'fair', 'poor', 'critical', 'dead'];

export const PLANTING_METHODS = ['direct_seed', 'transplant', 'cutting', 'division', 'layering', 'grafting'];

export const STATUSES_BY_METHOD: Record<string, string[]> = {
  direct_seed: ['planned', 'seed_started', 'germinated', 'seedling'],
  transplant: ['planned', 'seedling', 'hardening_off', 'transplanted', 'vegetative', 'flowering', 'fruiting'],
  cutting: ['planned', 'vegetative'],
  division: ['planned', 'vegetative'],
  layering: ['planned', 'vegetative'],
  grafting: ['planned', 'vegetative'],
};

export const DEFAULT_STATUS_FOR_METHOD: Record<string, string> = {
  direct_seed: 'seed_started',
  transplant: 'transplanted',
  cutting: 'vegetative',
  division: 'vegetative',
  layering: 'vegetative',
  grafting: 'vegetative',
};

export const METHOD_FOR_STATUS: Record<string, string> = {
  seed_started: 'direct_seed',
  germinated: 'direct_seed',
  hardening_off: 'transplant',
  transplanted: 'transplant',
};
