-- Phase 1 Completion: Add missing columns from the V1 spec

-- Gardens: add total area and settings
ALTER TABLE gardens ADD COLUMN total_area_sqft REAL;
ALTER TABLE gardens ADD COLUMN settings TEXT NOT NULL DEFAULT '{}';

-- Plots: add is_covered, retired_at, tags
ALTER TABLE plots ADD COLUMN is_covered INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plots ADD COLUMN retired_at TEXT;
ALTER TABLE plots ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';

-- Plant instances: add expected/actual harvest dates, spacing, tags
ALTER TABLE plant_instances ADD COLUMN expected_harvest_date TEXT;
ALTER TABLE plant_instances ADD COLUMN actual_harvest_date TEXT;
ALTER TABLE plant_instances ADD COLUMN seed_depth_inches REAL;
ALTER TABLE plant_instances ADD COLUMN spacing_inches REAL;
ALTER TABLE plant_instances ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';

-- History log: add notes for change reasons
ALTER TABLE history_log ADD COLUMN notes TEXT;

-- Plant catalog: add fields from the comprehensive V1 spec
ALTER TABLE plant_catalog ADD COLUMN genus TEXT;
ALTER TABLE plant_catalog ADD COLUMN gdd_to_maturity REAL;
ALTER TABLE plant_catalog ADD COLUMN seeds_per_foot REAL;
ALTER TABLE plant_catalog ADD COLUMN thin_to_inches REAL;
ALTER TABLE plant_catalog ADD COLUMN transplant_weeks_after_last_frost INTEGER;
ALTER TABLE plant_catalog ADD COLUMN succession_planting_interval_days INTEGER;
ALTER TABLE plant_catalog ADD COLUMN harvest_window_days INTEGER;
ALTER TABLE plant_catalog ADD COLUMN harvest_indicators TEXT;
ALTER TABLE plant_catalog ADD COLUMN expected_yield_per_plant REAL;
ALTER TABLE plant_catalog ADD COLUMN yield_unit TEXT;
ALTER TABLE plant_catalog ADD COLUMN storage_life_days INTEGER;
ALTER TABLE plant_catalog ADD COLUMN storage_method TEXT;
ALTER TABLE plant_catalog ADD COLUMN is_perennial INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plant_catalog ADD COLUMN chill_hours_required INTEGER;
ALTER TABLE plant_catalog ADD COLUMN years_to_first_fruit INTEGER;
ALTER TABLE plant_catalog ADD COLUMN pruning_season TEXT;
ALTER TABLE plant_catalog ADD COLUMN pruning_notes TEXT;
ALTER TABLE plant_catalog ADD COLUMN pollination_type TEXT;
ALTER TABLE plant_catalog ADD COLUMN pollination_partners TEXT NOT NULL DEFAULT '[]';
ALTER TABLE plant_catalog ADD COLUMN common_pests TEXT NOT NULL DEFAULT '[]';
ALTER TABLE plant_catalog ADD COLUMN common_diseases TEXT NOT NULL DEFAULT '[]';
ALTER TABLE plant_catalog ADD COLUMN disease_resistance TEXT NOT NULL DEFAULT '{}';
ALTER TABLE plant_catalog ADD COLUMN rotation_notes TEXT;
ALTER TABLE plant_catalog ADD COLUMN nitrogen_fixer INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plant_catalog ADD COLUMN heavy_feeder INTEGER NOT NULL DEFAULT 0;
ALTER TABLE plant_catalog ADD COLUMN varieties TEXT NOT NULL DEFAULT '[]';
ALTER TABLE plant_catalog ADD COLUMN culinary_notes TEXT;
ALTER TABLE plant_catalog ADD COLUMN preservation_methods TEXT NOT NULL DEFAULT '[]';
ALTER TABLE plant_catalog ADD COLUMN tags TEXT NOT NULL DEFAULT '[]';

-- Fix history_log composite index to include timestamp
DROP INDEX IF EXISTS idx_history_entity;
CREATE INDEX idx_history_entity ON history_log(entity_type, entity_id, timestamp);

-- Add entity_type + timestamp index for timeline queries
CREATE INDEX IF NOT EXISTS idx_history_type_time ON history_log(entity_type, timestamp);
