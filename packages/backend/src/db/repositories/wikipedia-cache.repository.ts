import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository.js';

export interface WikipediaCacheRow {
  id: string;
  plant_catalog_id: string;
  extract: string | null;
  extract_html: string | null;
  thumbnail_url: string | null;
  description: string | null;
  fetched_at: string;
  created_at: string;
  updated_at: string;
}

export class WikipediaCacheRepository extends BaseRepository<WikipediaCacheRow> {
  constructor(db: Database.Database) {
    super(db, 'wikipedia_cache');
  }

  findByPlantCatalogId(plantCatalogId: string): WikipediaCacheRow | undefined {
    return this.db
      .prepare('SELECT * FROM wikipedia_cache WHERE plant_catalog_id = ?')
      .get(plantCatalogId) as WikipediaCacheRow | undefined;
  }
}
