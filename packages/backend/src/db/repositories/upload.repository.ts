import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository.js';

export interface UploadRow {
  id: string;
  original_name: string;
  stored_name: string;
  mime_type: string;
  size_bytes: number;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

export class UploadRepository extends BaseRepository<UploadRow> {
  constructor(db: Database.Database) {
    super(db, 'uploads');
  }

  findByEntity(entityType: string, entityId: string): UploadRow[] {
    return this.db.prepare(
      'SELECT * FROM uploads WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC'
    ).all(entityType, entityId) as UploadRow[];
  }
}
