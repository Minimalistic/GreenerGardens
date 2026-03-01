-- Phase 5b: Companion/Rotation/Pest, Notes, Search, Tags, Uploads

-- Uploads table (file upload infrastructure)
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  original_name TEXT NOT NULL,
  stored_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_uploads_entity ON uploads(entity_type, entity_id);

-- Pest events table
CREATE TABLE IF NOT EXISTS pest_events (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  pest_type TEXT NOT NULL DEFAULT 'other',
  pest_name TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  detected_date TEXT NOT NULL,
  resolved_date TEXT,
  treatment_applied TEXT,
  treatment_type TEXT DEFAULT 'none',
  outcome TEXT DEFAULT 'ongoing',
  photos TEXT DEFAULT '[]',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pest_events_entity ON pest_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_pest_events_date ON pest_events(detected_date);
CREATE INDEX IF NOT EXISTS idx_pest_events_outcome ON pest_events(outcome);

-- Soil tests table
CREATE TABLE IF NOT EXISTS soil_tests (
  id TEXT PRIMARY KEY,
  plot_id TEXT NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  test_date TEXT NOT NULL,
  ph REAL,
  nitrogen_ppm REAL,
  phosphorus_ppm REAL,
  potassium_ppm REAL,
  organic_matter_pct REAL,
  calcium_ppm REAL,
  magnesium_ppm REAL,
  moisture_level TEXT,
  amendments_applied TEXT DEFAULT '[]',
  lab_name TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_soil_tests_plot ON soil_tests(plot_id);
CREATE INDEX IF NOT EXISTS idx_soil_tests_date ON soil_tests(test_date);

-- Notes table (first-class entity)
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text',
  entity_links TEXT DEFAULT '[]',
  photo_ids TEXT DEFAULT '[]',
  tags TEXT DEFAULT '[]',
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at DESC);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Entity tags junction table
CREATE TABLE IF NOT EXISTS entity_tags (
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  PRIMARY KEY (tag_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON entity_tags(entity_type, entity_id);
