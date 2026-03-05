import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import { SeedInventoryCreateSchema, SeedInventoryUpdateSchema } from '@gardenvault/shared';
import type { SeedInventoryRepository, SeedInventoryRow, SeedInventoryWithPlantRow } from '../db/repositories/seed-inventory.repository.js';
import type { HistoryLogger } from './history.middleware.js';
import { NotFoundError } from '../utils/errors.js';

export class SeedInventoryService {
  constructor(
    private db: Database.Database,
    private seedRepo: SeedInventoryRepository,
    private history: HistoryLogger,
  ) {}

  private deserialize(row: SeedInventoryRow | SeedInventoryWithPlantRow) {
    if (!row) return row;
    return { ...row, tags: row.tags ? JSON.parse(row.tags) : [] };
  }

  findAll(options?: { limit?: number; offset?: number; expiring_soon?: boolean; low_quantity?: boolean }) {
    if (options?.expiring_soon) return this.seedRepo.findExpiringSoonWithPlant().map(r => this.deserialize(r));
    if (options?.low_quantity) return this.seedRepo.findLowQuantityWithPlant().map(r => this.deserialize(r));
    return this.seedRepo.findAllWithPlant({ limit: options?.limit, offset: options?.offset }).map(r => this.deserialize(r));
  }

  findById(id: string) {
    const row = this.seedRepo.findById(id);
    if (!row) throw new NotFoundError('SeedInventory', id);
    return this.deserialize(row);
  }

  findByPlant(plantCatalogId: string) {
    return this.seedRepo.findByPlant(plantCatalogId).map(r => this.deserialize(r));
  }

  create(data: unknown) {
    const parsed = SeedInventoryCreateSchema.parse(data);
    const id = uuid();
    const row: Record<string, any> = { id, ...parsed };
    if (row.tags) row.tags = JSON.stringify(row.tags);

    return this.db.transaction(() => {
      const created = this.seedRepo.insert(row);
      this.history.logCreate('seed_inventory', created);
      return this.deserialize(created);
    })();
  }

  update(id: string, data: unknown) {
    const parsed = SeedInventoryUpdateSchema.parse(data);
    const updateData: Record<string, any> = { ...parsed };
    if (updateData.tags) updateData.tags = JSON.stringify(updateData.tags);

    return this.db.transaction(() => {
      const old = this.seedRepo.findById(id);
      if (!old) throw new NotFoundError('SeedInventory', id);
      const updated = this.seedRepo.update(id, updateData);
      if (!updated) throw new NotFoundError('SeedInventory', id);
      this.history.logUpdate('seed_inventory', id, old, updated);
      return this.deserialize(updated);
    })();
  }

  deductSeeds(id: string, count: number) {
    return this.db.transaction(() => {
      const old = this.seedRepo.findById(id);
      if (!old) throw new NotFoundError('SeedInventory', id);
      const newQty = Math.max(0, (old.quantity_packets ?? 0) - count);
      const updated = this.seedRepo.update(id, { quantity_packets: newQty });
      if (!updated) throw new NotFoundError('SeedInventory', id);
      this.history.logUpdate('seed_inventory', id, old, updated);
      return this.deserialize(updated);
    })();
  }

  delete(id: string): void {
    this.db.transaction(() => {
      const old = this.seedRepo.findById(id);
      if (!old) throw new NotFoundError('SeedInventory', id);
      this.seedRepo.delete(id);
      this.history.logDelete('seed_inventory', old);
    })();
  }
}
