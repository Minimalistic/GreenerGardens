import type Database from 'better-sqlite3';
import { BaseRepository, type SqlParam } from './base.repository.js';

export interface PestEventRow {
  id: string;
  entity_type: string;
  entity_id: string;
  pest_type: string;
  pest_name: string;
  severity: string;
  detected_date: string;
  resolved_date: string | null;
  treatment_applied: string | null;
  treatment_type: string;
  outcome: string;
  photos: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export class PestEventRepository extends BaseRepository<PestEventRow> {
  constructor(db: Database.Database) {
    super(db, 'pest_events');
  }

  findFiltered(filters: {
    entity_type?: string;
    entity_id?: string;
    pest_type?: string;
    outcome?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  }): PestEventRow[] {
    const conditions: string[] = [];
    const params: SqlParam[] = [];

    if (filters.entity_type) { conditions.push('entity_type = ?'); params.push(filters.entity_type); }
    if (filters.entity_id) { conditions.push('entity_id = ?'); params.push(filters.entity_id); }
    if (filters.pest_type) { conditions.push('pest_type = ?'); params.push(filters.pest_type); }
    if (filters.outcome) { conditions.push('outcome = ?'); params.push(filters.outcome); }
    if (filters.severity) { conditions.push('severity = ?'); params.push(filters.severity); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    return this.db.prepare(
      `SELECT * FROM pest_events ${where} ORDER BY detected_date DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as PestEventRow[];
  }

  countFiltered(filters: {
    entity_type?: string;
    entity_id?: string;
    outcome?: string;
  }): number {
    const conditions: string[] = [];
    const params: SqlParam[] = [];

    if (filters.entity_type) { conditions.push('entity_type = ?'); params.push(filters.entity_type); }
    if (filters.entity_id) { conditions.push('entity_id = ?'); params.push(filters.entity_id); }
    if (filters.outcome) { conditions.push('outcome = ?'); params.push(filters.outcome); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const row = this.db.prepare(`SELECT COUNT(*) as count FROM pest_events ${where}`).get(...params) as { count: number };
    return row.count;
  }

  findByEntity(entityType: string, entityId: string): PestEventRow[] {
    return this.db.prepare(
      'SELECT * FROM pest_events WHERE entity_type = ? AND entity_id = ? ORDER BY detected_date DESC'
    ).all(entityType, entityId) as PestEventRow[];
  }
}
