import type Database from 'better-sqlite3';
import { BaseRepository, type SqlParam } from './base.repository.js';

export interface FeedbackRow {
  id: string;
  feedback_type: string;
  title: string;
  description: string;
  severity: string | null;
  status: string;
  page_route: string | null;
  element_context: string | null;
  created_at: string;
  updated_at: string;
}

export class FeedbackRepository extends BaseRepository<FeedbackRow> {
  constructor(db: Database.Database) {
    super(db, 'feedback');
  }

  findFiltered(filters: {
    feedback_type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): FeedbackRow[] {
    const conditions: string[] = [];
    const params: SqlParam[] = [];

    if (filters.feedback_type) {
      conditions.push('feedback_type = ?');
      params.push(filters.feedback_type);
    }

    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    return this.db.prepare(
      `SELECT * FROM feedback ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as FeedbackRow[];
  }
}
