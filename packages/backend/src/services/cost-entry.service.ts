import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import { CostEntryCreateSchema, CostEntryUpdateSchema } from '@gardenvault/shared';
import type { CostEntryRepository } from '../db/repositories/cost-entry.repository.js';
import type { HistoryLogger } from './history.middleware.js';
import { NotFoundError } from '../utils/errors.js';

export class CostEntryService {
  constructor(
    private db: Database.Database,
    private costRepo: CostEntryRepository,
    private history: HistoryLogger,
  ) {}

  findAll(userId: string, options?: { category?: string; limit?: number; offset?: number }) {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    if (options?.category) {
      return this.db.prepare(
        'SELECT * FROM cost_entries WHERE user_id = ? AND category = ? ORDER BY entry_date DESC LIMIT ? OFFSET ?'
      ).all(userId, options.category, limit, offset);
    }
    return this.db.prepare(
      'SELECT * FROM cost_entries WHERE user_id = ? ORDER BY entry_date DESC LIMIT ? OFFSET ?'
    ).all(userId, limit, offset);
  }

  findById(id: string, userId: string) {
    const row = this.db.prepare('SELECT * FROM cost_entries WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!row) throw new NotFoundError('CostEntry', id);
    return row;
  }

  getSummary(userId: string, year?: number) {
    const yearFilter = year ? `AND strftime('%Y', entry_date) = ?` : '';
    const params = year ? [userId, String(year)] : [userId];
    return this.db.prepare(`
      SELECT category, SUM(amount) as total, COUNT(*) as count
      FROM cost_entries WHERE user_id = ? ${yearFilter}
      GROUP BY category ORDER BY total DESC
    `).all(...params);
  }

  getTotalByYear(userId: string) {
    return this.db.prepare(`
      SELECT strftime('%Y', entry_date) as year, SUM(amount) as total, COUNT(*) as count
      FROM cost_entries WHERE user_id = ?
      GROUP BY year ORDER BY year ASC
    `).all(userId);
  }

  create(data: unknown, userId: string) {
    const parsed = CostEntryCreateSchema.parse(data);
    const id = uuid();
    const row: Record<string, any> = { id, ...parsed, user_id: userId };

    return this.db.transaction(() => {
      const created = this.costRepo.insert(row);
      this.history.logCreate('cost_entry', created);
      return created;
    })();
  }

  update(id: string, data: unknown, userId: string) {
    const parsed = CostEntryUpdateSchema.parse(data);

    return this.db.transaction(() => {
      const old = this.db.prepare('SELECT * FROM cost_entries WHERE id = ? AND user_id = ?').get(id, userId) as any;
      if (!old) throw new NotFoundError('CostEntry', id);
      const updated = this.costRepo.update(id, parsed);
      if (!updated) throw new NotFoundError('CostEntry', id);
      this.history.logUpdate('cost_entry', id, old, updated);
      return updated;
    })();
  }

  delete(id: string, userId: string): void {
    this.db.transaction(() => {
      const old = this.db.prepare('SELECT * FROM cost_entries WHERE id = ? AND user_id = ?').get(id, userId) as any;
      if (!old) throw new NotFoundError('CostEntry', id);
      this.costRepo.delete(id);
      this.history.logDelete('cost_entry', old);
    })();
  }
}
