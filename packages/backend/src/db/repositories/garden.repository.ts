import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository.js';

export interface GardenRow {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  usda_zone: string | null;
  timezone: string | null;
  last_frost_date: string | null;
  first_frost_date: string | null;
  total_area_sqft: number | null;
  settings: string;
  created_at: string;
  updated_at: string;
}

export class GardenRepository extends BaseRepository<GardenRow> {
  constructor(db: Database.Database) {
    super(db, 'gardens');
  }

  getDeletionImpact(id: string): { plots: number; sub_plots: number; plant_instances: number; harvests: number; soil_tests: number; notes: number } {
    const row = this.db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM plots WHERE garden_id = ?) AS plots,
        (SELECT COUNT(*) FROM sub_plots WHERE plot_id IN (SELECT id FROM plots WHERE garden_id = ?)) AS sub_plots,
        (SELECT COUNT(*) FROM plant_instances WHERE plot_id IN (SELECT id FROM plots WHERE garden_id = ?)) AS plant_instances,
        (SELECT COUNT(*) FROM harvests WHERE plant_instance_id IN (SELECT id FROM plant_instances WHERE plot_id IN (SELECT id FROM plots WHERE garden_id = ?))) AS harvests,
        (SELECT COUNT(*) FROM soil_tests WHERE plot_id IN (SELECT id FROM plots WHERE garden_id = ?)) AS soil_tests,
        (SELECT COUNT(DISTINCT n.id) FROM notes n, json_each(n.entity_links) je
          WHERE (json_extract(je.value, '$.entity_type') = 'garden' AND json_extract(je.value, '$.entity_id') = ?)
             OR (json_extract(je.value, '$.entity_type') = 'plot' AND json_extract(je.value, '$.entity_id') IN (SELECT id FROM plots WHERE garden_id = ?))
             OR (json_extract(je.value, '$.entity_type') = 'plant_instance' AND json_extract(je.value, '$.entity_id') IN (SELECT id FROM plant_instances WHERE plot_id IN (SELECT id FROM plots WHERE garden_id = ?)))
        ) AS notes
    `).get(id, id, id, id, id, id, id, id) as { plots: number; sub_plots: number; plant_instances: number; harvests: number; soil_tests: number; notes: number };
    return row;
  }
}
