-- Phase 6: Seed Inventory & Cost Tracking
CREATE TABLE IF NOT EXISTS seed_inventory (
  id TEXT PRIMARY KEY,
  plant_catalog_id TEXT REFERENCES plant_catalog(id),
  variety_name TEXT NOT NULL,
  brand TEXT,
  source TEXT,
  quantity_packets INTEGER DEFAULT 0,
  quantity_seeds_approx INTEGER,
  purchase_date TEXT,
  expiration_date TEXT,
  lot_number TEXT,
  germination_rate_tested REAL,
  storage_location TEXT,
  cost_cents INTEGER,
  notes TEXT,
  tags TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_seed_inventory_plant ON seed_inventory(plant_catalog_id);
CREATE INDEX idx_seed_inventory_expiry ON seed_inventory(expiration_date);

CREATE TABLE IF NOT EXISTS cost_entries (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'other',
  entity_type TEXT,
  entity_id TEXT,
  amount_cents INTEGER NOT NULL,
  description TEXT NOT NULL,
  purchase_date TEXT NOT NULL,
  vendor TEXT,
  receipt_upload_id TEXT REFERENCES uploads(id),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_cost_entries_category ON cost_entries(category);
CREATE INDEX idx_cost_entries_date ON cost_entries(purchase_date);
CREATE INDEX idx_cost_entries_entity ON cost_entries(entity_type, entity_id);
