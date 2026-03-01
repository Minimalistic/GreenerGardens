import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository.js';

export interface SeedInventoryRow {
  id: string;
  plant_catalog_id: string | null;
  variety_name: string;
  brand: string | null;
  source: string | null;
  quantity_packets: number;
  quantity_seeds_approx: number | null;
  purchase_date: string | null;
  expiration_date: string | null;
  lot_number: string | null;
  germination_rate_tested: number | null;
  storage_location: string | null;
  cost_cents: number | null;
  notes: string | null;
  tags: string;
  created_at: string;
  updated_at: string;
}

export class SeedInventoryRepository extends BaseRepository<SeedInventoryRow> {
  constructor(db: Database.Database) {
    super(db, 'seed_inventory');
  }

  findByPlant(plantCatalogId: string): SeedInventoryRow[] {
    return this.db.prepare('SELECT * FROM seed_inventory WHERE plant_catalog_id = ? ORDER BY created_at DESC').all(plantCatalogId) as SeedInventoryRow[];
  }

  findExpiringSoon(daysAhead: number = 90): SeedInventoryRow[] {
    return this.db.prepare(
      `SELECT * FROM seed_inventory WHERE expiration_date IS NOT NULL AND expiration_date <= date('now', '+' || ? || ' days') AND expiration_date >= date('now') ORDER BY expiration_date ASC`
    ).all(daysAhead) as SeedInventoryRow[];
  }

  findLowQuantity(threshold: number = 1): SeedInventoryRow[] {
    return this.db.prepare(
      'SELECT * FROM seed_inventory WHERE quantity_packets <= ? ORDER BY quantity_packets ASC'
    ).all(threshold) as SeedInventoryRow[];
  }
}
