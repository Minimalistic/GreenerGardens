import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository.js';

export interface HarvestRow {
  id: string;
  plant_instance_id: string;
  plot_id: string;
  date_harvested: string;
  quantity: number;
  unit: string;
  quality: string;
  destination: string;
  weight_oz: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HarvestStats {
  total_harvests: number;
  total_weight_oz: number;
  unique_plants: number;
  this_season_count: number;
}

export class HarvestRepository extends BaseRepository<HarvestRow> {
  constructor(db: Database.Database) {
    super(db, 'harvests');
  }

  findByPlantInstanceId(plantInstanceId: string): HarvestRow[] {
    return this.db.prepare(
      'SELECT * FROM harvests WHERE plant_instance_id = ? ORDER BY date_harvested DESC'
    ).all(plantInstanceId) as HarvestRow[];
  }

  findByDateRange(startDate: string, endDate: string): HarvestRow[] {
    return this.db.prepare(
      'SELECT * FROM harvests WHERE date_harvested BETWEEN ? AND ? ORDER BY date_harvested DESC'
    ).all(startDate, endDate) as HarvestRow[];
  }

  getStats(): HarvestStats {
    const yearStart = `${new Date().getFullYear()}-01-01`;
    const row = this.db.prepare(`
      SELECT
        COUNT(*) as total_harvests,
        COALESCE(SUM(weight_oz), 0) as total_weight_oz,
        COUNT(DISTINCT plant_instance_id) as unique_plants,
        (SELECT COUNT(*) FROM harvests WHERE date_harvested >= ?) as this_season_count
      FROM harvests
    `).get(yearStart) as HarvestStats;
    return row;
  }

  findWithPlantInfo(limit: number = 20, offset: number = 0): (HarvestRow & { common_name: string; variety_name: string | null })[] {
    return this.db.prepare(`
      SELECT h.*, pc.common_name, pi.variety_name
      FROM harvests h
      JOIN plant_instances pi ON h.plant_instance_id = pi.id
      JOIN plant_catalog pc ON pi.plant_catalog_id = pc.id
      ORDER BY h.date_harvested DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as (HarvestRow & { common_name: string; variety_name: string | null })[];
  }
}
