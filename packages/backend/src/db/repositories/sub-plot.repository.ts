import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository.js';

export interface SubPlotRow {
  id: string;
  plot_id: string;
  grid_row: number;
  grid_col: number;
  geometry_json: string;
  plant_instance_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubPlotWithPlantRow extends SubPlotRow {
  plant_name: string | null;
  plant_catalog_id: string | null;
  plant_type: string | null;
  variety_name: string | null;
  status: string | null;
  health: string | null;
  date_planted: string | null;
  expected_harvest_date: string | null;
  planting_method: string | null;
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

  findByPlotIdWithPlantInfo(plotId: string): SubPlotWithPlantRow[] {
    return this.db.prepare(`
      SELECT sp.*, pc.common_name as plant_name, pi.plant_catalog_id, pc.plant_type, pi.variety_name,
             pi.status, pi.health, pi.date_planted, pi.expected_harvest_date, pi.planting_method
      FROM sub_plots sp
      LEFT JOIN plant_instances pi ON sp.plant_instance_id = pi.id
      LEFT JOIN plant_catalog pc ON pi.plant_catalog_id = pc.id
      WHERE sp.plot_id = ?
      ORDER BY sp.grid_row, sp.grid_col
    `).all(plotId) as SubPlotWithPlantRow[];
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
