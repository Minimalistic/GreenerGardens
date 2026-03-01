-- Phase 2a: Weather readings, daily summaries, and tasks

CREATE TABLE IF NOT EXISTS weather_readings (
  id TEXT PRIMARY KEY,
  garden_id TEXT NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  timestamp TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'api_current',
  temperature_f REAL,
  feels_like_f REAL,
  humidity_pct REAL,
  wind_speed_mph REAL,
  wind_direction TEXT,
  precipitation_inches REAL,
  precipitation_type TEXT DEFAULT 'none',
  cloud_cover_pct REAL,
  uv_index REAL,
  dew_point_f REAL,
  pressure_inhg REAL,
  sunrise TEXT,
  sunset TEXT,
  day_length_hours REAL,
  gdd_base50 REAL,
  raw_api_response TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_weather_garden_time ON weather_readings(garden_id, timestamp);

CREATE TABLE IF NOT EXISTS weather_daily_summary (
  id TEXT PRIMARY KEY,
  garden_id TEXT NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  high_f REAL,
  low_f REAL,
  avg_f REAL,
  precipitation_total_inches REAL,
  gdd_accumulated REAL,
  frost_occurred INTEGER NOT NULL DEFAULT 0,
  freeze_occurred INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_weather_daily_garden_date ON weather_daily_summary(garden_id, date);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  entity_type TEXT,
  entity_id TEXT,
  task_type TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  completed_date TEXT,
  is_recurring INTEGER NOT NULL DEFAULT 0,
  recurrence_rule TEXT DEFAULT '{}',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  auto_generated INTEGER NOT NULL DEFAULT 0,
  source_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_entity ON tasks(entity_type, entity_id);
