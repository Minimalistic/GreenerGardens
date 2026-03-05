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

  findAll(filters: { feedback_type?: string; status?: string; limit?: number; offset?: number }) {
    return this.feedbackRepo.findFiltered(filters);
  }

  findById(id: string) {
    const row = this.feedbackRepo.findById(id);
    if (!row) throw new NotFoundError('Feedback', id);
    return row;
  }

  create(data: unknown) {
    const parsed = FeedbackCreateSchema.parse(data);
    const id = uuid();

    const row: Record<string, any> = {
      id,
      ...parsed,
      status: 'open',
    };

    const result = this.db.transaction(() => {
      const created = this.feedbackRepo.insert(row);
      this.history.logCreate('feedback', created);
      return created;
    })();

    return result;
  }

  update(id: string, data: unknown) {
    const parsed = FeedbackUpdateSchema.parse(data);

    const result = this.db.transaction(() => {
      const old = this.feedbackRepo.findById(id);
      if (!old) throw new NotFoundError('Feedback', id);
      const updated = this.feedbackRepo.update(id, { ...parsed });
      if (!updated) throw new NotFoundError('Feedback', id);
      this.history.logUpdate('feedback', id, old, updated);
      return updated;
    })();

    return result;
  }

  delete(id: string): void {
    this.db.transaction(() => {
      const old = this.feedbackRepo.findById(id);
      if (!old) throw new NotFoundError('Feedback', id);
      this.feedbackRepo.delete(id);
      this.history.logDelete('feedback', old);
    })();
  }
}
