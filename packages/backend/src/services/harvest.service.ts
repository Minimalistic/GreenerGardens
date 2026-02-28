import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import { HarvestCreateSchema, HarvestUpdateSchema } from '@gardenvault/shared';
import type { HarvestRepository } from '../db/repositories/harvest.repository.js';
import type { HistoryLogger } from './history.middleware.js';
import { NotFoundError } from '../utils/errors.js';

export class HarvestService {
  constructor(
    private db: Database.Database,
    private harvestRepo: HarvestRepository,
    private history: HistoryLogger,
  ) {}

  findAll(options?: { limit?: number; offset?: number }) {
    return this.harvestRepo.findWithPlantInfo(options?.limit, options?.offset);
  }

  findById(id: string) {
    const harvest = this.harvestRepo.findById(id);
    if (!harvest) throw new NotFoundError('Harvest', id);
    return harvest;
  }

  findByPlantInstanceId(plantInstanceId: string) {
    return this.harvestRepo.findByPlantInstanceId(plantInstanceId);
  }

  getStats() {
    return this.harvestRepo.getStats();
  }

  create(data: unknown) {
    const parsed = HarvestCreateSchema.parse(data);
    const id = uuid();

    const row: Record<string, any> = { id, ...parsed };

    const result = this.db.transaction(() => {
      const created = this.harvestRepo.insert(row);
      this.history.logCreate('harvest', created);
      return created;
    })();

    return result;
  }

  update(id: string, data: unknown) {
    const parsed = HarvestUpdateSchema.parse(data);

    const result = this.db.transaction(() => {
      const old = this.harvestRepo.findById(id);
      if (!old) throw new NotFoundError('Harvest', id);

      const updated = this.harvestRepo.update(id, parsed);
      if (!updated) throw new NotFoundError('Harvest', id);

      this.history.logUpdate('harvest', id, old, updated);
      return updated;
    })();

    return result;
  }

  delete(id: string): void {
    this.db.transaction(() => {
      const old = this.harvestRepo.findById(id);
      if (!old) throw new NotFoundError('Harvest', id);

      this.harvestRepo.delete(id);
      this.history.logDelete('harvest', old);
    })();
  }
}
