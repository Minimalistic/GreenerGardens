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

  findAll(options?: { category?: string; limit?: number; offset?: number }) {
    if (options?.category) return this.costRepo.findByCategory(options.category, options.limit, options.offset);
    return this.costRepo.findAll({ limit: options?.limit, offset: options?.offset });
  }

  findById(id: string) {
    const row = this.costRepo.findById(id);
    if (!row) throw new NotFoundError('CostEntry', id);
    return row;
  }

  getSummary(year?: number) {
    return this.costRepo.getSummaryByCategory(year);
  }

  getTotalByYear() {
    return this.costRepo.getTotalByYear();
  }

  create(data: unknown) {
    const parsed = CostEntryCreateSchema.parse(data);
    const id = uuid();
    const row: Record<string, any> = { id, ...parsed };

    return this.db.transaction(() => {
      const created = this.costRepo.insert(row);
      this.history.logCreate('cost_entry', created);
      return created;
    })();
  }

  update(id: string, data: unknown) {
    const parsed = CostEntryUpdateSchema.parse(data);

    return this.db.transaction(() => {
      const old = this.costRepo.findById(id);
      if (!old) throw new NotFoundError('CostEntry', id);
      const updated = this.costRepo.update(id, parsed);
      if (!updated) throw new NotFoundError('CostEntry', id);
      this.history.logUpdate('cost_entry', id, old, updated);
      return updated;
    })();
  }

  delete(id: string): void {
    this.db.transaction(() => {
      const old = this.costRepo.findById(id);
      if (!old) throw new NotFoundError('CostEntry', id);
      this.costRepo.delete(id);
      this.history.logDelete('cost_entry', old);
    })();
  }
}
