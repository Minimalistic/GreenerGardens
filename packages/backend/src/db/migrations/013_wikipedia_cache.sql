CREATE TABLE IF NOT EXISTS wikipedia_cache (
  id TEXT PRIMARY KEY,
  plant_catalog_id TEXT NOT NULL UNIQUE,
  extract TEXT,
  extract_html TEXT,
  thumbnail_url TEXT,
  description TEXT,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plant_catalog_id) REFERENCES plant_catalog(id) ON DELETE CASCADE
);
