import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.resolve(__dirname, '../../../../seed_data/plant_catalog.json');

export function seedPlantCatalog(db: Database.Database): void {
  // Check if already seeded
  const count = (db.prepare('SELECT COUNT(*) as count FROM plant_catalog').get() as any).count;
  if (count > 0) {
    console.log(`Plant catalog already seeded with ${count} entries`);
    return;
  }

  if (!fs.existsSync(SEED_FILE)) {
    console.log('No seed data file found at', SEED_FILE);
    return;
  }

  const plants = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));

  const stmt = db.prepare(`
    INSERT INTO plant_catalog (
      id, common_name, scientific_name, family, plant_type, lifecycle, description,
      image_url, sun_exposure, water_needs, min_zone, max_zone,
      soil_ph_min, soil_ph_max, spacing_inches, row_spacing_inches,
      height_inches_min, height_inches_max,
      days_to_germination_min, days_to_germination_max,
      days_to_maturity_min, days_to_maturity_max,
      planting_depth_inches, indoor_start_weeks_before_frost, outdoor_sow_weeks_after_frost,
      harvest_instructions, storage_instructions,
      companions_json, antagonists_json, rotation_family, growing_tips_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const insertAll = db.transaction((items: any[]) => {
    for (const p of items) {
      stmt.run(
        uuid(),
        p.common_name,
        p.scientific_name ?? null,
        p.family ?? null,
        p.plant_type,
        p.lifecycle ?? null,
        p.description ?? null,
        p.image_url ?? null,
        p.sun_exposure ?? null,
        p.water_needs ?? null,
        p.min_zone ?? null,
        p.max_zone ?? null,
        p.soil_ph_min ?? null,
        p.soil_ph_max ?? null,
        p.spacing_inches ?? null,
        p.row_spacing_inches ?? null,
        p.height_inches_min ?? null,
        p.height_inches_max ?? null,
        p.days_to_germination_min ?? null,
        p.days_to_germination_max ?? null,
        p.days_to_maturity_min ?? null,
        p.days_to_maturity_max ?? null,
        p.planting_depth_inches ?? null,
        p.indoor_start_weeks_before_frost ?? null,
        p.outdoor_sow_weeks_after_frost ?? null,
        p.harvest_instructions ?? null,
        p.storage_instructions ?? null,
        JSON.stringify(p.companions ?? []),
        JSON.stringify(p.antagonists ?? []),
        p.rotation_family ?? null,
        JSON.stringify(p.growing_tips ?? []),
      );
    }
  });

  insertAll(plants);
  console.log(`Seeded ${plants.length} plants into catalog`);
}
