import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import { GardenCreateSchema, GardenUpdateSchema } from '@gardenvault/shared';
import type { GardenRepository, GardenRow } from '../db/repositories/garden.repository.js';
import type { HistoryLogger } from './history.middleware.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

export class GardenService {
  constructor(
    private db: Database.Database,
    private gardenRepo: GardenRepository,
    private history: HistoryLogger,
  ) {}

  getSetupStatus() {
    const count = this.gardenRepo.count();
    return { is_setup_complete: count > 0, garden_count: count };
  }

  findAll() {
    return this.gardenRepo.findAll({ orderBy: 'name', orderDir: 'ASC' });
  }

  findById(id: string) {
    const garden = this.gardenRepo.findById(id);
    if (!garden) throw new NotFoundError('Garden', id);
    return garden;
  }

  create(data: unknown): GardenRow {
    const parsed = GardenCreateSchema.parse(data);
    const id = uuid();

    const row: Record<string, any> = { id, ...parsed };

    const result = this.db.transaction(() => {
      const created = this.gardenRepo.insert(row);
      this.history.logCreate('garden', created);
      return created;
    })();

    return result;
  }

  update(id: string, data: unknown): GardenRow {
    const parsed = GardenUpdateSchema.parse(data);

    const result = this.db.transaction(() => {
      const old = this.gardenRepo.findById(id);
      if (!old) throw new NotFoundError('Garden', id);

      const updated = this.gardenRepo.update(id, parsed);
      if (!updated) throw new NotFoundError('Garden', id);

      this.history.logUpdate('garden', id, old, updated);
      return updated;
    })();

    return result;
  }

  delete(id: string): void {
    this.db.transaction(() => {
      const old = this.gardenRepo.findById(id);
      if (!old) throw new NotFoundError('Garden', id);

      this.gardenRepo.delete(id);
      this.history.logDelete('garden', old);
    })();
  }
}
