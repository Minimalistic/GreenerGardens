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
      image_url, emoji, sun_exposure, water_needs, min_zone, max_zone,
      soil_ph_min, soil_ph_max, spacing_inches, row_spacing_inches,
      height_inches_min, height_inches_max,
      days_to_germination_min, days_to_germination_max,
      days_to_maturity_min, days_to_maturity_max,
      planting_depth_inches, indoor_start_weeks_before_frost, outdoor_sow_weeks_after_frost,
      transplant_weeks_after_last_frost, succession_planting_interval_days,
      harvest_instructions, storage_instructions,
      companions_json, antagonists_json, rotation_family, growing_tips_json, wikipedia_url
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
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
        p.emoji ?? null,
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
        p.transplant_weeks_after_last_frost ?? null,
        p.succession_planting_interval_days ?? null,
        p.harvest_instructions ?? null,
        p.storage_instructions ?? null,
        JSON.stringify(p.companions ?? []),
        JSON.stringify(p.antagonists ?? []),
        p.rotation_family ?? null,
        JSON.stringify(p.growing_tips ?? []),
        p.wikipedia_url ?? null,
      );
    }
  });

  insertAll(plants);
  console.log(`Seeded ${plants.length} plants into catalog`);
}

export function updatePlantImages(db: Database.Database): void {
  if (!fs.existsSync(SEED_FILE)) return;

  const plants = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
  const plantsWithImages = plants.filter((p: any) => p.image_url);
  if (plantsWithImages.length === 0) return;

  const stmt = db.prepare(
    `UPDATE plant_catalog SET image_url = ? WHERE common_name = ? AND image_url IS NULL`
  );

  let updated = 0;
  const updateAll = db.transaction((items: any[]) => {
    for (const p of items) {
      const result = stmt.run(p.image_url, p.common_name);
      if (result.changes > 0) updated++;
    }
  });

  updateAll(plantsWithImages);
  if (updated > 0) {
    console.log(`Updated ${updated} plant images from seed data`);
  }
}

export function updatePlantEmojis(db: Database.Database): void {
  if (!fs.existsSync(SEED_FILE)) return;

  const plants = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
  const plantsWithEmojis = plants.filter((p: any) => p.emoji);
  if (plantsWithEmojis.length === 0) return;

  const stmt = db.prepare(
    `UPDATE plant_catalog SET emoji = ? WHERE common_name = ? AND emoji IS NULL`
  );

  let updated = 0;
  const updateAll = db.transaction((items: any[]) => {
    for (const p of items) {
      const result = stmt.run(p.emoji, p.common_name);
      if (result.changes > 0) updated++;
    }
  });

  updateAll(plantsWithEmojis);
  if (updated > 0) {
    console.log(`Updated ${updated} plant emojis from seed data`);
  }
}

export function updatePlantCompanions(db: Database.Database): void {
  if (!fs.existsSync(SEED_FILE)) return;

  const plants = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));

  const stmt = db.prepare(
    `UPDATE plant_catalog SET companions_json = ?, antagonists_json = ? WHERE common_name = ?`
  );

  let updated = 0;
  const updateAll = db.transaction((items: any[]) => {
    for (const p of items) {
      if (!p.companions && !p.antagonists) continue;
      const result = stmt.run(
        JSON.stringify(p.companions ?? []),
        JSON.stringify(p.antagonists ?? []),
        p.common_name,
      );
      if (result.changes > 0) updated++;
    }
  });

  updateAll(plants);
  if (updated > 0) {
    console.log(`Updated ${updated} plant companion data from seed data`);
  }
}

export function updatePlantWikipediaUrls(db: Database.Database): void {
  if (!fs.existsSync(SEED_FILE)) return;

  const plants = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
  const plantsWithUrls = plants.filter((p: any) => p.wikipedia_url);
  if (plantsWithUrls.length === 0) return;

  const stmt = db.prepare(
    `UPDATE plant_catalog SET wikipedia_url = ? WHERE common_name = ? AND wikipedia_url IS NULL`
  );

  let updated = 0;
  const updateAll = db.transaction((items: any[]) => {
    for (const p of items) {
      const result = stmt.run(p.wikipedia_url, p.common_name);
      if (result.changes > 0) updated++;
    }
  });

  updateAll(plantsWithUrls);
  if (updated > 0) {
    console.log(`Updated ${updated} plant Wikipedia URLs from seed data`);
  }
}

export function updatePlantPestData(db: Database.Database): void {
  if (!fs.existsSync(SEED_FILE)) return;

  const plants = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
  const plantsWithPestData = plants.filter(
    (p: any) => p.common_pests || p.common_diseases || p.disease_resistance,
  );
  if (plantsWithPestData.length === 0) return;

  const stmt = db.prepare(
    `UPDATE plant_catalog SET common_pests = ?, common_diseases = ?, disease_resistance = ?
     WHERE common_name = ? AND common_pests = '[]' AND common_diseases = '[]' AND disease_resistance = '{}'`
  );

  let updated = 0;
  const updateAll = db.transaction((items: any[]) => {
    for (const p of items) {
      const result = stmt.run(
        JSON.stringify(p.common_pests ?? []),
        JSON.stringify(p.common_diseases ?? []),
        JSON.stringify(p.disease_resistance ?? {}),
        p.common_name,
      );
      if (result.changes > 0) updated++;
    }
  });

  updateAll(plantsWithPestData);
  if (updated > 0) {
    console.log(`Updated ${updated} plant pest/disease data from seed data`);
  }
}
