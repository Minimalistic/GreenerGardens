import type Database from 'better-sqlite3';
import { BaseRepository, type FindAllOptions } from './base.repository.js';

export interface PestCatalogRow {
  id: string;
  common_name: string;
  scientific_name: string | null;
  category: string;
  subcategory: string | null;
  description: string | null;
  emoji: string | null;
  image_url: string | null;
  appearance_json: string;
  symptoms_json: string;
  life_cycle: string | null;
  affected_plants_json: string;
  favorable_conditions_json: string;
  min_zone: number | null;
  max_zone: number | null;
  seasonality: string | null;
  severity_potential: string;
  spread_rate: string;
  damage_type: string;
  prevention_json: string;
  organic_treatments_json: string;
  chemical_treatments_json: string;
  biological_treatments_json: string;
  cultural_treatments_json: string;
  is_custom: number;
  created_at: string;
  updated_at: string;
}

export interface PestSearchOptions extends FindAllOptions {
  search?: string;
  category?: string;
  severity?: string;
  affected_plant?: string;
}

export class PestCatalogRepository extends BaseRepository<PestCatalogRow> {
  constructor(db: Database.Database) {
    super(db, 'pest_catalog');
  }

  search(options: PestSearchOptions = {}): { data: PestCatalogRow[]; total: number } {
    const { search, category, severity, affected_plant,
      limit = 20, offset = 0, orderBy = 'common_name', orderDir = 'ASC' } = options;

    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      conditions.push('(common_name LIKE ? OR scientific_name LIKE ? OR description LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (severity) {
      conditions.push('severity_potential = ?');
      params.push(severity);
    }
    if (affected_plant) {
      conditions.push('affected_plants_json LIKE ?');
      params.push(`%${affected_plant}%`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = (this.db.prepare(
      `SELECT COUNT(*) as count FROM pest_catalog ${where}`
    ).get(...params) as any).count;

    const data = this.db.prepare(
      `SELECT * FROM pest_catalog ${where} ORDER BY ${orderBy} ${orderDir} LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as PestCatalogRow[];

    return { data, total };
  }

  bulkInsert(pests: Record<string, any>[]): void {
    if (pests.length === 0) return;

    const keys = Object.keys(pests[0]);
    const placeholders = keys.map(() => '?').join(', ');
    const stmt = this.db.prepare(
      `INSERT OR IGNORE INTO pest_catalog (${keys.join(', ')}) VALUES (${placeholders})`
    );

    const insertMany = this.db.transaction((items: Record<string, any>[]) => {
      for (const item of items) {
        stmt.run(...keys.map(k => item[k]));
      }
    });

    insertMany(pests);
  }
}
