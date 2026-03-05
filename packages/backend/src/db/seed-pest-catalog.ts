import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.resolve(__dirname, '../../../../seed_data/pest_catalog.json');

interface SeedPest {
  common_name: string;
  scientific_name?: string;
  category: string;
  subcategory?: string;
  description?: string;
  emoji?: string;
  image_url?: string;
  appearance?: string[];
  symptoms?: string[];
  life_cycle?: string;
  affected_plants?: string[];
  favorable_conditions?: string[];
  min_zone?: number;
  max_zone?: number;
  seasonality?: string;
  severity_potential?: string;
  spread_rate?: string;
  damage_type?: string;
  prevention?: string[];
  organic_treatments?: unknown[];
  chemical_treatments?: unknown[];
  biological_treatments?: unknown[];
  cultural_treatments?: unknown[];
}

export function seedPestCatalog(db: Database.Database): void {
  const count = (db.prepare('SELECT COUNT(*) as count FROM pest_catalog').get() as { count: number }).count;
  if (count > 0) {
    console.log(`Pest catalog already seeded with ${count} entries`);
    return;
  }

  if (!fs.existsSync(SEED_FILE)) {
    console.log('No pest catalog seed data file found at', SEED_FILE);
    return;
  }

  const pests = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));

  const stmt = db.prepare(`
    INSERT INTO pest_catalog (
      id, common_name, scientific_name, category, subcategory, description,
      emoji, image_url, appearance_json, symptoms_json, life_cycle,
      affected_plants_json, favorable_conditions_json,
      min_zone, max_zone, seasonality,
      severity_potential, spread_rate, damage_type,
      prevention_json,
      organic_treatments_json, chemical_treatments_json,
      biological_treatments_json, cultural_treatments_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const insertAll = db.transaction((items: SeedPest[]) => {
    for (const p of items) {
      stmt.run(
        uuid(),
        p.common_name,
        p.scientific_name ?? null,
        p.category,
        p.subcategory ?? null,
        p.description ?? null,
        p.emoji ?? null,
        p.image_url ?? null,
        JSON.stringify(p.appearance ?? []),
        JSON.stringify(p.symptoms ?? []),
        p.life_cycle ?? null,
        JSON.stringify(p.affected_plants ?? []),
        JSON.stringify(p.favorable_conditions ?? []),
        p.min_zone ?? null,
        p.max_zone ?? null,
        p.seasonality ?? null,
        p.severity_potential ?? 'medium',
        p.spread_rate ?? 'moderate',
        p.damage_type ?? 'cosmetic',
        JSON.stringify(p.prevention ?? []),
        JSON.stringify(p.organic_treatments ?? []),
        JSON.stringify(p.chemical_treatments ?? []),
        JSON.stringify(p.biological_treatments ?? []),
        JSON.stringify(p.cultural_treatments ?? []),
      );
    }
  });

  insertAll(pests);
  console.log(`Seeded ${pests.length} entries into pest catalog`);
}
