import type Database from 'better-sqlite3';
import { BaseRepository, type FindAllOptions } from './base.repository.js';

export interface PlantCatalogRow {
  id: string;
  common_name: string;
  scientific_name: string | null;
  family: string | null;
  plant_type: string;
  lifecycle: string | null;
  description: string | null;
  image_url: string | null;
  emoji: string | null;
  sun_exposure: string | null;
  water_needs: string | null;
  min_zone: number | null;
  max_zone: number | null;
  soil_ph_min: number | null;
  soil_ph_max: number | null;
  spacing_inches: number | null;
  row_spacing_inches: number | null;
  height_inches_min: number | null;
  height_inches_max: number | null;
  days_to_germination_min: number | null;
  days_to_germination_max: number | null;
  days_to_maturity_min: number | null;
  days_to_maturity_max: number | null;
  planting_depth_inches: number | null;
  indoor_start_weeks_before_frost: number | null;
  outdoor_sow_weeks_after_frost: number | null;
  transplant_weeks_after_last_frost: number | null;
  succession_planting_interval_days: number | null;
  harvest_instructions: string | null;
  storage_instructions: string | null;
  companions_json: string;
  antagonists_json: string;
  rotation_family: string | null;
  growing_tips_json: string;
  is_custom: number;
  created_at: string;
  updated_at: string;
}

export interface SearchOptions extends FindAllOptions {
  search?: string;
  plant_type?: string;
  lifecycle?: string;
  sun_exposure?: string;
  water_needs?: string;
  min_zone?: number;
  max_zone?: number;
}

export class PlantCatalogRepository extends BaseRepository<PlantCatalogRow> {
  constructor(db: Database.Database) {
    super(db, 'plant_catalog');
  }

  search(options: SearchOptions = {}): { data: PlantCatalogRow[]; total: number } {
    const { search, plant_type, lifecycle, sun_exposure, water_needs, min_zone, max_zone,
      limit = 20, offset = 0, orderBy = 'common_name', orderDir = 'ASC' } = options;

    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      conditions.push('(common_name LIKE ? OR scientific_name LIKE ? OR family LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (plant_type) {
      conditions.push('plant_type = ?');
      params.push(plant_type);
    }
    if (lifecycle) {
      conditions.push('lifecycle = ?');
      params.push(lifecycle);
    }
    if (sun_exposure) {
      conditions.push('sun_exposure = ?');
      params.push(sun_exposure);
    }
    if (water_needs) {
      conditions.push('water_needs = ?');
      params.push(water_needs);
    }
    if (min_zone !== undefined) {
      conditions.push('min_zone >= ?');
      params.push(min_zone);
    }
    if (max_zone !== undefined) {
      conditions.push('(max_zone <= ? OR max_zone IS NULL)');
      params.push(max_zone);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = (this.db.prepare(
      `SELECT COUNT(*) as count FROM plant_catalog ${where}`
    ).get(...params) as any).count;

    const data = this.db.prepare(
      `SELECT * FROM plant_catalog ${where} ORDER BY ${orderBy} ${orderDir} LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as PlantCatalogRow[];

    return { data, total };
  }

  bulkInsert(plants: Record<string, any>[]): void {
    if (plants.length === 0) return;

    const keys = Object.keys(plants[0]);
    const placeholders = keys.map(() => '?').join(', ');
    const stmt = this.db.prepare(
      `INSERT OR IGNORE INTO plant_catalog (${keys.join(', ')}) VALUES (${placeholders})`
    );

    const insertMany = this.db.transaction((items: Record<string, any>[]) => {
      for (const item of items) {
        stmt.run(...keys.map(k => item[k]));
      }
    });

    insertMany(plants);
  }
}
