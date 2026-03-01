import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository.js';

export interface PlotRow {
  id: string;
  garden_id: string;
  name: string;
  plot_type: string;
  dimensions_json: string;
  geometry_json: string;
  soil_type: string | null;
  sun_exposure: string | null;
  irrigation: string | null;
  is_covered: number;
  retired_at: string | null;
  tags: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export class PlotRepository extends BaseRepository<PlotRow> {
  constructor(db: Database.Database) {
    super(db, 'plots');
  }

  findByGardenId(gardenId: string): PlotRow[] {
    return this.db.prepare(
      'SELECT * FROM plots WHERE garden_id = ? ORDER BY created_at ASC'
    ).all(gardenId) as PlotRow[];
  }
}
