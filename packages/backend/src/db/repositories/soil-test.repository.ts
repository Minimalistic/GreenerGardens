import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository.js';

export interface SoilTestRow {
  id: string;
  plot_id: string;
  test_date: string;
  ph: number | null;
  nitrogen_ppm: number | null;
  phosphorus_ppm: number | null;
  potassium_ppm: number | null;
  organic_matter_pct: number | null;
  calcium_ppm: number | null;
  magnesium_ppm: number | null;
  moisture_level: string | null;
  amendments_applied: string;
  lab_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export class SoilTestRepository extends BaseRepository<SoilTestRow> {
  constructor(db: Database.Database) {
    super(db, 'soil_tests');
  }

  findByPlot(plotId: string, limit = 50, offset = 0): SoilTestRow[] {
    return this.db.prepare(
      'SELECT * FROM soil_tests WHERE plot_id = ? ORDER BY test_date DESC LIMIT ? OFFSET ?'
    ).all(plotId, limit, offset) as SoilTestRow[];
  }

  findTrends(plotId: string): SoilTestRow[] {
    return this.db.prepare(
      'SELECT * FROM soil_tests WHERE plot_id = ? ORDER BY test_date ASC'
    ).all(plotId) as SoilTestRow[];
  }
}
