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

export interface SeedInventoryWithPlantRow extends SeedInventoryRow {
  plant_name: string | null;
  plant_emoji: string | null;
}

export class SeedInventoryRepository extends BaseRepository<SeedInventoryRow> {
  constructor(db: Database.Database) {
    super(db, 'seed_inventory');
  }

  private static readonly PLANT_JOIN = `
    SELECT si.*, pc.common_name AS plant_name, pc.emoji AS plant_emoji
    FROM seed_inventory si
    LEFT JOIN plant_catalog pc ON si.plant_catalog_id = pc.id`;

  findAllWithPlant(options?: { limit?: number; offset?: number }): SeedInventoryWithPlantRow[] {
    let sql = `${SeedInventoryRepository.PLANT_JOIN} ORDER BY si.created_at DESC`;
    if (options?.limit) sql += ` LIMIT ${options.limit}`;
    if (options?.offset) sql += ` OFFSET ${options.offset}`;
    return this.db.prepare(sql).all() as SeedInventoryWithPlantRow[];
  }

  findByPlant(plantCatalogId: string): SeedInventoryRow[] {
    return this.db.prepare('SELECT * FROM seed_inventory WHERE plant_catalog_id = ? ORDER BY created_at DESC').all(plantCatalogId) as SeedInventoryRow[];
  }

  findExpiringSoonWithPlant(daysAhead: number = 90): SeedInventoryWithPlantRow[] {
    return this.db.prepare(
      `${SeedInventoryRepository.PLANT_JOIN} WHERE si.expiration_date IS NOT NULL AND si.expiration_date <= date('now', '+' || ? || ' days') AND si.expiration_date >= date('now') ORDER BY si.expiration_date ASC`
    ).all(daysAhead) as SeedInventoryWithPlantRow[];
  }

  findLowQuantityWithPlant(threshold: number = 1): SeedInventoryWithPlantRow[] {
    return this.db.prepare(
      `${SeedInventoryRepository.PLANT_JOIN} WHERE si.quantity_packets <= ? ORDER BY si.quantity_packets ASC`
    ).all(threshold) as SeedInventoryWithPlantRow[];
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
