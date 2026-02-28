-- Gardens table
CREATE TABLE IF NOT EXISTS gardens (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT,
  latitude REAL,
  longitude REAL,
  usda_zone TEXT,
  timezone TEXT,
  last_frost_date TEXT,
  first_frost_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Plots table
CREATE TABLE IF NOT EXISTS plots (
  id TEXT PRIMARY KEY,
  garden_id TEXT NOT NULL,
  name TEXT NOT NULL,
  plot_type TEXT NOT NULL DEFAULT 'raised_bed',
  dimensions_json TEXT NOT NULL DEFAULT '{}',
  geometry_json TEXT NOT NULL DEFAULT '{}',
  soil_type TEXT,
  sun_exposure TEXT,
  irrigation TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE
);

-- Plant catalog table
CREATE TABLE IF NOT EXISTS plant_catalog (
  id TEXT PRIMARY KEY,
  common_name TEXT NOT NULL,
  scientific_name TEXT,
  family TEXT,
  plant_type TEXT NOT NULL DEFAULT 'vegetable',
  lifecycle TEXT,
  description TEXT,
  image_url TEXT,
  sun_exposure TEXT,
  water_needs TEXT,
  min_zone INTEGER,
  max_zone INTEGER,
  soil_ph_min REAL,
  soil_ph_max REAL,
  spacing_inches REAL,
  row_spacing_inches REAL,
  height_inches_min REAL,
  height_inches_max REAL,
  days_to_germination_min INTEGER,
  days_to_germination_max INTEGER,
  days_to_maturity_min INTEGER,
  days_to_maturity_max INTEGER,
  planting_depth_inches REAL,
  indoor_start_weeks_before_frost INTEGER,
  outdoor_sow_weeks_after_frost INTEGER,
  harvest_instructions TEXT,
  storage_instructions TEXT,
  companions_json TEXT DEFAULT '[]',
  antagonists_json TEXT DEFAULT '[]',
  rotation_family TEXT,
  growing_tips_json TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Plant instances table (must be before sub_plots due to FK)
CREATE TABLE IF NOT EXISTS plant_instances (
  id TEXT PRIMARY KEY,
  plant_catalog_id TEXT NOT NULL,
  plot_id TEXT NOT NULL,
  sub_plot_id TEXT,
  variety_name TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  health TEXT NOT NULL DEFAULT 'good',
  planting_method TEXT,
  date_planted TEXT,
  date_germinated TEXT,
  date_transplanted TEXT,
  date_first_harvest TEXT,
  date_finished TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  source TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plant_catalog_id) REFERENCES plant_catalog(id),
  FOREIGN KEY (plot_id) REFERENCES plots(id) ON DELETE CASCADE
);

-- Sub-plots table
CREATE TABLE IF NOT EXISTS sub_plots (
  id TEXT PRIMARY KEY,
  plot_id TEXT NOT NULL,
  grid_row INTEGER NOT NULL,
  grid_col INTEGER NOT NULL,
  plant_instance_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plot_id) REFERENCES plots(id) ON DELETE CASCADE,
  FOREIGN KEY (plant_instance_id) REFERENCES plant_instances(id) ON DELETE SET NULL
);

-- Harvests table
CREATE TABLE IF NOT EXISTS harvests (
  id TEXT PRIMARY KEY,
  plant_instance_id TEXT NOT NULL,
  plot_id TEXT NOT NULL,
  date_harvested TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  quality TEXT NOT NULL DEFAULT 'good',
  destination TEXT NOT NULL DEFAULT 'eaten_fresh',
  weight_oz REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plant_instance_id) REFERENCES plant_instances(id) ON DELETE CASCADE,
  FOREIGN KEY (plot_id) REFERENCES plots(id) ON DELETE CASCADE
);

-- History log table (no foreign keys - references may outlive entities)
CREATE TABLE IF NOT EXISTS history_log (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  field_changes_json TEXT,
  snapshot_json TEXT,
  changed_by TEXT NOT NULL DEFAULT 'system'
);

-- Indexes for history_log
CREATE INDEX IF NOT EXISTS idx_history_entity ON history_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_history_action ON history_log(action);

-- Entity lookup indexes
CREATE INDEX IF NOT EXISTS idx_plots_garden ON plots(garden_id);
CREATE INDEX IF NOT EXISTS idx_sub_plots_plot ON sub_plots(plot_id);
CREATE INDEX IF NOT EXISTS idx_sub_plots_plant ON sub_plots(plant_instance_id);
CREATE INDEX IF NOT EXISTS idx_plant_instances_plot ON plant_instances(plot_id);
CREATE INDEX IF NOT EXISTS idx_plant_instances_catalog ON plant_instances(plant_catalog_id);
CREATE INDEX IF NOT EXISTS idx_plant_instances_status ON plant_instances(status);
CREATE INDEX IF NOT EXISTS idx_harvests_plant ON harvests(plant_instance_id);
CREATE INDEX IF NOT EXISTS idx_harvests_plot ON harvests(plot_id);
CREATE INDEX IF NOT EXISTS idx_harvests_date ON harvests(date_harvested DESC);

-- Plant catalog search indexes
CREATE INDEX IF NOT EXISTS idx_catalog_name ON plant_catalog(common_name);
CREATE INDEX IF NOT EXISTS idx_catalog_type ON plant_catalog(plant_type);
CREATE INDEX IF NOT EXISTS idx_catalog_lifecycle ON plant_catalog(lifecycle);
