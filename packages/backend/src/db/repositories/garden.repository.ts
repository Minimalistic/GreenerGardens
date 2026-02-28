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
  created_at: string;
  updated_at: string;
}

export class GardenRepository extends BaseRepository<GardenRow> {
  constructor(db: Database.Database) {
    super(db, 'gardens');
  }
}
