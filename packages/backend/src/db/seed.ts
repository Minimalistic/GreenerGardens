import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.resolve(__dirname, '../../../../seed_data/plant_catalog.json');

interface SeedPlant {
  common_name: string;
  scientific_name?: string;
  family?: string;
  plant_type: string;
  lifecycle?: string;
  description?: string;
  image_url?: string;
  emoji?: string;
  sun_exposure?: string;
  water_needs?: string;
  min_zone?: number;
  max_zone?: number;
  soil_ph_min?: number;
  soil_ph_max?: number;
  spacing_inches?: number;
  row_spacing_inches?: number;
  height_inches_min?: number;
  height_inches_max?: number;
  days_to_germination_min?: number;
  days_to_germination_max?: number;
  days_to_maturity_min?: number;
  days_to_maturity_max?: number;
  planting_depth_inches?: number;
  indoor_start_weeks_before_frost?: number;
  outdoor_sow_weeks_after_frost?: number;
  transplant_weeks_after_last_frost?: number;
  succession_planting_interval_days?: number;
  harvest_instructions?: string;
  storage_instructions?: string;
  companions?: unknown[];
  antagonists?: unknown[];
  rotation_family?: string;
  growing_tips?: string[];
  wikipedia_url?: string;
  common_pests?: unknown[];
  common_diseases?: unknown[];
  disease_resistance?: Record<string, string>;
}

export function seedPlantCatalog(db: Database.Database): void {
  if (!fs.existsSync(SEED_FILE)) {
    console.log('No seed data file found at', SEED_FILE);
    return;
  }

  const plants = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));

  // Build set of existing plant names to avoid duplicates
  const existing = new Set<string>(
    (db.prepare('SELECT common_name FROM plant_catalog').all() as { common_name: string }[]).map(r => r.common_name.toLowerCase()),
  );

  const newPlants = plants.filter((p: SeedPlant) => !existing.has(p.common_name.toLowerCase()));
  if (newPlants.length === 0) {
    console.log(`Plant catalog up to date (${existing.size} entries)`);
    return;
  }

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

  const insertAll = db.transaction((items: SeedPlant[]) => {
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

  insertAll(newPlants);
  console.log(`Seeded ${newPlants.length} new plants into catalog (${existing.size + newPlants.length} total)`);
}

export function updatePlantImages(db: Database.Database): void {
  if (!fs.existsSync(SEED_FILE)) return;

  const plants = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
  const plantsWithImages = plants.filter((p: SeedPlant) => p.image_url);
  if (plantsWithImages.length === 0) return;

  const stmt = db.prepare(
    `UPDATE plant_catalog SET image_url = ? WHERE common_name = ? AND (image_url IS NULL OR image_url != ?)`
  );

  let updated = 0;
  const updateAll = db.transaction((items: SeedPlant[]) => {
    for (const p of items) {
      const result = stmt.run(p.image_url, p.common_name, p.image_url);
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
  const plantsWithEmojis = plants.filter((p: SeedPlant) => p.emoji);
  if (plantsWithEmojis.length === 0) return;

  const stmt = db.prepare(
    `UPDATE plant_catalog SET emoji = ? WHERE common_name = ? AND emoji IS NULL`
  );

  let updated = 0;
  const updateAll = db.transaction((items: SeedPlant[]) => {
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
  const updateAll = db.transaction((items: SeedPlant[]) => {
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
  const plantsWithUrls = plants.filter((p: SeedPlant) => p.wikipedia_url);
  if (plantsWithUrls.length === 0) return;

  const stmt = db.prepare(
    `UPDATE plant_catalog SET wikipedia_url = ? WHERE common_name = ? AND wikipedia_url IS NULL`
  );

  let updated = 0;
  const updateAll = db.transaction((items: SeedPlant[]) => {
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

/**
 * Seeds a default garden with the full property layout template.
 * Only runs when no gardens exist yet.
 *
 * Property: ~152' (N-S) x ~110' (E-W), Duluth MN
 * House: 3 contiguous rectangles, north edges aligned at y=76'
 *   Left wing:  14' x 27'  (x=37)
 *   Center:     29' x 30'  (x=51)  — front edge 46' from curb
 *   Right wing: 20' x 24'  (x=80)
 */
export function seedDefaultGarden(db: Database.Database): void {
  const gardenCount = (db.prepare('SELECT COUNT(*) as cnt FROM gardens').get() as { cnt: number }).cnt;
  if (gardenCount > 0) return;

  const PX_PER_FT = 40;
  const gardenId = uuid();
  const now = new Date().toISOString();

  // Create garden with property dimensions and location
  db.prepare(`
    INSERT INTO gardens (id, name, description, address, latitude, longitude, usda_zone, timezone,
                         last_frost_date, first_frost_date, total_area_sqft, settings,
                         created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    gardenId,
    'My Garden',
    '152\' x 110\' residential property',
    '4721 Glenwood St. Duluth MN, 55804',
    46.84044525679375,
    -92.02815002841402,
    '4b',
    'America/Chicago',
    '05-01',
    '10-01',
    16720,
    JSON.stringify({ property_width_ft: 110, property_height_ft: 152 }),
    now,
    now,
  );

  // Full property layout: { name, type, x_ft, y_ft, w_ft, h_ft }
  const objects: { name: string; type: string; x: number; y: number; w: number; h: number }[] = [
    // House — 3 sections, north edges aligned at y=76'
    { name: 'House (Left Wing)',   type: 'house',     x: 37, y: 76, w: 14, h: 27 },
    { name: 'House (Center)',      type: 'house',     x: 51, y: 76, w: 29, h: 30 },
    { name: 'House (Right Wing)',  type: 'house',     x: 80, y: 76, w: 20, h: 24 },
    // Backyard garden fence enclosure
    { name: 'Backyard Garden',     type: 'fence',     x: 16, y: 32, w: 32, h: 36 },
    // Driveway (house to street)
    { name: 'Driveway',           type: 'driveway',   x: 87, y: 100, w:  8, h: 43 },
    { name: 'Driveway Entrance',  type: 'driveway',   x: 87, y: 147, w:  8, h:  4 },
    // Walkways & stairs
    { name: 'BrickPatio',         type: 'path',       x: 80, y: 100, w:  7, h:  2 },
    { name: 'FrontStairs',        type: 'path',       x: 55, y: 106, w:  4, h:  4 },
    { name: 'Front Walkway',      type: 'path',       x: 56, y: 110, w:  2, h: 33 },
    { name: 'Front Walkway 2',    type: 'path',       x: 56, y: 147, w:  2, h:  4 },
    { name: 'Walkway',            type: 'path',       x: 84, y: 111, w:  3, h:  6 },
    { name: 'Walkway2',           type: 'path',       x: 58, y: 113, w: 26, h:  2 },
    // Street infrastructure
    { name: 'Sidewalk',           type: 'path',       x:  0, y: 143, w: 110, h:  4 },
    { name: 'Curb',               type: 'other',      x:  0, y: 151, w: 110, h:  1 },
  ];

  const objStmt = db.prepare(`
    INSERT INTO garden_objects (id, garden_id, name, object_type, geometry_json, color, opacity, label_visible, z_index, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const obj of objects) {
    objStmt.run(
      uuid(),
      gardenId,
      obj.name,
      obj.type,
      JSON.stringify({
        x: obj.x * PX_PER_FT,
        y: obj.y * PX_PER_FT,
        width: obj.w * PX_PER_FT,
        height: obj.h * PX_PER_FT,
        rotation: 0,
      }),
      null,
      0.7,
      1,
      0,
      now,
      now,
    );
  }

  console.log('Seeded default garden with property layout (14 objects)');
}

export function updatePlantPestData(db: Database.Database): void {
  if (!fs.existsSync(SEED_FILE)) return;

  const plants = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
  const plantsWithPestData = plants.filter(
    (p: SeedPlant) => p.common_pests || p.common_diseases || p.disease_resistance,
  );
  if (plantsWithPestData.length === 0) return;

  const stmt = db.prepare(
    `UPDATE plant_catalog SET common_pests = ?, common_diseases = ?, disease_resistance = ?
     WHERE common_name = ? AND common_pests = '[]' AND common_diseases = '[]' AND disease_resistance = '{}'`
  );

  let updated = 0;
  const updateAll = db.transaction((items: SeedPlant[]) => {
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
