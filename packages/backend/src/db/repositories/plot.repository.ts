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

  getDeletionImpact(id: string): { sub_plots: number; plant_instances: number; harvests: number; soil_tests: number; notes: number } {
    const row = this.db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM sub_plots WHERE plot_id = ?) AS sub_plots,
        (SELECT COUNT(*) FROM plant_instances WHERE plot_id = ?) AS plant_instances,
        (SELECT COUNT(*) FROM harvests WHERE plant_instance_id IN (SELECT id FROM plant_instances WHERE plot_id = ?)) AS harvests,
        (SELECT COUNT(*) FROM soil_tests WHERE plot_id = ?) AS soil_tests,
        (SELECT COUNT(DISTINCT n.id) FROM notes n, json_each(n.entity_links) je
          WHERE (json_extract(je.value, '$.entity_type') = 'plot' AND json_extract(je.value, '$.entity_id') = ?)
             OR (json_extract(je.value, '$.entity_type') = 'plant_instance' AND json_extract(je.value, '$.entity_id') IN (SELECT id FROM plant_instances WHERE plot_id = ?))
        ) AS notes
    `).get(id, id, id, id, id, id) as { sub_plots: number; plant_instances: number; harvests: number; soil_tests: number; notes: number };
    return row;
  }
}
