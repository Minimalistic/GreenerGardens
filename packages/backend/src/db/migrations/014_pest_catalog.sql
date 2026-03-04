-- Pest & Disease Reference Catalog
CREATE TABLE IF NOT EXISTS pest_catalog (
  id TEXT PRIMARY KEY,

  -- Identification
  common_name TEXT NOT NULL,
  scientific_name TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  subcategory TEXT,
  description TEXT,
  emoji TEXT,
  image_url TEXT,

  -- Identification details
  appearance_json TEXT DEFAULT '[]',
  symptoms_json TEXT DEFAULT '[]',
  life_cycle TEXT,

  -- Affected plants
  affected_plants_json TEXT DEFAULT '[]',
  favorable_conditions_json TEXT DEFAULT '[]',

  -- Geographic info
  min_zone INTEGER,
  max_zone INTEGER,
  seasonality TEXT,

  -- Severity info
  severity_potential TEXT DEFAULT 'medium',
  spread_rate TEXT DEFAULT 'moderate',
  damage_type TEXT DEFAULT 'cosmetic',

  -- Prevention
  prevention_json TEXT DEFAULT '[]',

  -- Treatments
  organic_treatments_json TEXT DEFAULT '[]',
  chemical_treatments_json TEXT DEFAULT '[]',
  biological_treatments_json TEXT DEFAULT '[]',
  cultural_treatments_json TEXT DEFAULT '[]',

  is_custom INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pest_catalog_common_name ON pest_catalog(common_name);
CREATE INDEX IF NOT EXISTS idx_pest_catalog_category ON pest_catalog(category);
CREATE INDEX IF NOT EXISTS idx_pest_catalog_severity ON pest_catalog(severity_potential);
