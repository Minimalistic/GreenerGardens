import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository.js';

export interface GardenObjectRow {
  id: string;
  garden_id: string;
  name: string;
  object_type: string;
  geometry_json: string;
  color: string | null;
  opacity: number;
  label_visible: number;
  z_index: number;
  created_at: string;
  updated_at: string;
}

export class GardenObjectRepository extends BaseRepository<GardenObjectRow> {
  constructor(db: Database.Database) {
    super(db, 'garden_objects');
  }

  findByGardenId(gardenId: string): GardenObjectRow[] {
    return this.db.prepare(
      'SELECT * FROM garden_objects WHERE garden_id = ? ORDER BY z_index ASC, created_at ASC'
    ).all(gardenId) as GardenObjectRow[];
  }
}
