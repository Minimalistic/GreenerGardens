import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import { SoilTestCreateSchema, SoilTestUpdateSchema } from '@gardenvault/shared';
import type { SoilTestRepository, SoilTestRow } from '../db/repositories/soil-test.repository.js';
import type { HistoryLogger } from './history.middleware.js';
import { NotFoundError } from '../utils/errors.js';

export class SoilTestService {
  constructor(
    private db: Database.Database,
    private soilTestRepo: SoilTestRepository,
    private history: HistoryLogger,
  ) {}

  findByPlot(plotId: string, limit?: number, offset?: number) {
    return this.soilTestRepo.findByPlot(plotId, limit, offset).map(r => this.deserialize(r));
  }

  findById(id: string) {
    const row = this.soilTestRepo.findById(id);
    if (!row) throw new NotFoundError('SoilTest', id);
    return this.deserialize(row);
  }

  findTrends(plotId: string) {
    return this.soilTestRepo.findTrends(plotId).map(r => this.deserialize(r));
  }

  create(data: unknown) {
    const parsed = SoilTestCreateSchema.parse(data);
    const id = uuid();

    const row: Record<string, any> = {
      id,
      ...parsed,
      amendments_applied: JSON.stringify(parsed.amendments_applied ?? []),
    };

    const result = this.db.transaction(() => {
      const created = this.soilTestRepo.insert(row);
      this.history.logCreate('soil_test', created);
      return created;
    })();

    return this.deserialize(result);
  }

  update(id: string, data: unknown) {
    const parsed = SoilTestUpdateSchema.parse(data);
    const updateData: Record<string, any> = { ...parsed };

    if (parsed.amendments_applied !== undefined) {
      updateData.amendments_applied = JSON.stringify(parsed.amendments_applied);
    }

    const result = this.db.transaction(() => {
      const old = this.soilTestRepo.findById(id);
      if (!old) throw new NotFoundError('SoilTest', id);
      const updated = this.soilTestRepo.update(id, updateData);
      if (!updated) throw new NotFoundError('SoilTest', id);
      this.history.logUpdate('soil_test', id, old, updated);
      return updated;
    })();

    return this.deserialize(result);
  }

  delete(id: string): void {
    this.db.transaction(() => {
      const old = this.soilTestRepo.findById(id);
      if (!old) throw new NotFoundError('SoilTest', id);
      this.soilTestRepo.delete(id);
      this.history.logDelete('soil_test', old);
    })();
  }

  private deserialize(row: SoilTestRow) {
    return {
      ...row,
      amendments_applied: typeof row.amendments_applied === 'string' ? JSON.parse(row.amendments_applied) : row.amendments_applied,
    };
  }
}
