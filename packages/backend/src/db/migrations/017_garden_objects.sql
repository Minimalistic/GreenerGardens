-- Garden objects: non-plot visual elements on the garden canvas (house, greenhouse, fence, etc.)
CREATE TABLE IF NOT EXISTS garden_objects (
  id TEXT PRIMARY KEY,
  garden_id TEXT NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  object_type TEXT NOT NULL DEFAULT 'other',
  geometry_json TEXT NOT NULL DEFAULT '{"x":0,"y":0,"width":120,"height":80,"rotation":0}',
  color TEXT,
  opacity REAL NOT NULL DEFAULT 0.7,
  label_visible INTEGER NOT NULL DEFAULT 1,
  z_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_garden_objects_garden_id ON garden_objects(garden_id);
