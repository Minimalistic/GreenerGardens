import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import { FeedbackCreateSchema, FeedbackUpdateSchema } from '@gardenvault/shared';
import type { FeedbackRepository } from '../db/repositories/feedback.repository.js';
import type { HistoryLogger } from './history.middleware.js';
import { NotFoundError } from '../utils/errors.js';

export class FeedbackService {
  constructor(
    private db: Database.Database,
    private feedbackRepo: FeedbackRepository,
    private history: HistoryLogger,
  ) {}

  findAll(userId: string, filters: { feedback_type?: string; status?: string; limit?: number; offset?: number }) {
    const conditions: string[] = ['user_id = ?'];
    const params: any[] = [userId];
    if (filters.feedback_type) { conditions.push('feedback_type = ?'); params.push(filters.feedback_type); }
    if (filters.status) { conditions.push('status = ?'); params.push(filters.status); }
    const where = conditions.join(' AND ');
    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;
    params.push(limit, offset);
    return this.db.prepare(
      `SELECT * FROM feedback WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params);
  }

  findById(id: string, userId: string) {
    const row = this.db.prepare('SELECT * FROM feedback WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!row) throw new NotFoundError('Feedback', id);
    return row;
  }

  create(data: unknown, userId: string) {
    const parsed = FeedbackCreateSchema.parse(data);
    const id = uuid();

    const row: Record<string, any> = {
      id,
      ...parsed,
      user_id: userId,
      status: 'open',
    };

    const result = this.db.transaction(() => {
      const created = this.feedbackRepo.insert(row);
      this.history.logCreate('feedback', created);
      return created;
    })();

    return result;
  }

  update(id: string, data: unknown, userId: string) {
    const parsed = FeedbackUpdateSchema.parse(data);

    const result = this.db.transaction(() => {
      const old = this.db.prepare('SELECT * FROM feedback WHERE id = ? AND user_id = ?').get(id, userId) as any;
      if (!old) throw new NotFoundError('Feedback', id);
      const updated = this.feedbackRepo.update(id, { ...parsed });
      if (!updated) throw new NotFoundError('Feedback', id);
      this.history.logUpdate('feedback', id, old, updated);
      return updated;
    })();

    return result;
  }

  delete(id: string, userId: string): void {
    this.db.transaction(() => {
      const old = this.db.prepare('SELECT * FROM feedback WHERE id = ? AND user_id = ?').get(id, userId) as any;
      if (!old) throw new NotFoundError('Feedback', id);
      this.feedbackRepo.delete(id);
      this.history.logDelete('feedback', old);
    })();
  }
}
