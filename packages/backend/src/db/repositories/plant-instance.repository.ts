import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository.js';

export interface PlantInstanceRow {
  id: string;
  plant_catalog_id: string;
  plot_id: string;
  sub_plot_id: string | null;
  variety_name: string | null;
  status: string;
  health: string;
  planting_method: string | null;
  date_planted: string | null;
  date_germinated: string | null;
  date_transplanted: string | null;
  date_first_harvest: string | null;
  date_finished: string | null;
  quantity: number;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export class PlantInstanceRepository extends BaseRepository<PlantInstanceRow> {
  constructor(db: Database.Database) {
    super(db, 'plant_instances');
  }

  findByPlotId(plotId: string): PlantInstanceRow[] {
    return this.db.prepare(
      'SELECT * FROM plant_instances WHERE plot_id = ? ORDER BY created_at DESC'
    ).all(plotId) as PlantInstanceRow[];
  }

  findBySubPlotId(subPlotId: string): PlantInstanceRow | undefined {
    return this.db.prepare(
      'SELECT * FROM plant_instances WHERE sub_plot_id = ?'
    ).get(subPlotId) as PlantInstanceRow | undefined;
  }

  findByStatus(status: string): PlantInstanceRow[] {
    return this.db.prepare(
      'SELECT * FROM plant_instances WHERE status = ? ORDER BY created_at DESC'
    ).all(status) as PlantInstanceRow[];
  }

  findWithCatalogInfo(id: string): (PlantInstanceRow & { common_name: string; plant_type: string }) | undefined {
    return this.db.prepare(`
      SELECT pi.*, pc.common_name, pc.plant_type
      FROM plant_instances pi
      JOIN plant_catalog pc ON pi.plant_catalog_id = pc.id
      WHERE pi.id = ?
    `).get(id) as any;
  }
}
