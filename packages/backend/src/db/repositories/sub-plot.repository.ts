import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository.js';

export interface SubPlotRow {
  id: string;
  plot_id: string;
  grid_row: number;
  grid_col: number;
  plant_instance_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export class SubPlotRepository extends BaseRepository<SubPlotRow> {
  constructor(db: Database.Database) {
    super(db, 'sub_plots');
  }

  findByPlotId(plotId: string): SubPlotRow[] {
    return this.db.prepare(
      'SELECT * FROM sub_plots WHERE plot_id = ? ORDER BY grid_row, grid_col'
    ).all(plotId) as SubPlotRow[];
  }

  assignPlant(id: string, plantInstanceId: string): SubPlotRow | undefined {
    return this.db.prepare(
      `UPDATE sub_plots SET plant_instance_id = ?, updated_at = datetime('now') WHERE id = ? RETURNING *`
    ).get(plantInstanceId, id) as SubPlotRow | undefined;
  }

  clearPlant(id: string): SubPlotRow | undefined {
    return this.db.prepare(
      `UPDATE sub_plots SET plant_instance_id = NULL, updated_at = datetime('now') WHERE id = ? RETURNING *`
    ).get(id) as SubPlotRow | undefined;
  }

  clearPlantByInstanceId(plantInstanceId: string): void {
    this.db.prepare(
      `UPDATE sub_plots SET plant_instance_id = NULL, updated_at = datetime('now') WHERE plant_instance_id = ?`
    ).run(plantInstanceId);
  }
}
