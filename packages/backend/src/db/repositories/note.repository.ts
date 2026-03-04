import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository.js';

export interface NoteRow {
  id: string;
  content: string;
  content_type: string;
  entity_links: string;
  photo_ids: string;
  tags: string;
  pinned: number;
  note_date: string | null;
  created_at: string;
  updated_at: string;
}

export class NoteRepository extends BaseRepository<NoteRow> {
  constructor(db: Database.Database) {
    super(db, 'notes');
  }

  findFiltered(filters: {
    pinned?: boolean;
    limit?: number;
    offset?: number;
  }): NoteRow[] {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.pinned !== undefined) {
      conditions.push('pinned = ?');
      params.push(filters.pinned ? 1 : 0);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    return this.db.prepare(
      `SELECT * FROM notes ${where} ORDER BY pinned DESC, created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as NoteRow[];
  }

  findByEntity(entityType: string, entityId: string): NoteRow[] {
    // Search in entity_links JSON array for matching entity type and id
    return this.db.prepare(
      `SELECT DISTINCT n.* FROM notes n, json_each(n.entity_links) je
       WHERE json_extract(je.value, '$.entity_type') = ?
         AND json_extract(je.value, '$.entity_id') = ?
       ORDER BY n.pinned DESC, n.created_at DESC`
    ).all(entityType, entityId) as NoteRow[];
  }

  findByDate(date: string): NoteRow[] {
    return this.db.prepare(
      'SELECT * FROM notes WHERE note_date = ? ORDER BY pinned DESC, created_at DESC'
    ).all(date) as NoteRow[];
  }

  search(query: string, limit = 50): NoteRow[] {
    return this.db.prepare(
      'SELECT * FROM notes WHERE content LIKE ? ORDER BY created_at DESC LIMIT ?'
    ).all(`%${query}%`, limit) as NoteRow[];
  }
}
