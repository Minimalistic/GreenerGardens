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

  findAll(userId: string, options?: { limit?: number; offset?: number; expiring_soon?: boolean; low_quantity?: boolean }) {
    // For filtered queries, we need to scope by user_id
    if (options?.expiring_soon) return this.seedRepo.findExpiringSoonWithPlant().filter((r: any) => r.user_id === userId).map(r => this.deserialize(r));
    if (options?.low_quantity) return this.seedRepo.findLowQuantityWithPlant().filter((r: any) => r.user_id === userId).map(r => this.deserialize(r));
    const rows = this.db.prepare(
      `SELECT si.*, pc.common_name as plant_name, pc.emoji as plant_emoji
       FROM seed_inventory si
       LEFT JOIN plant_catalog pc ON si.plant_catalog_id = pc.id
       WHERE si.user_id = ?
       ORDER BY si.created_at DESC
       LIMIT ? OFFSET ?`
    ).all(userId, options?.limit ?? 100, options?.offset ?? 0) as any[];
    return rows.map(r => this.deserialize(r));
  }

  findById(id: string, userId: string) {
    const row = this.db.prepare('SELECT * FROM seed_inventory WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!row) throw new NotFoundError('SeedInventory', id);
    return this.deserialize(row);
  }

  findByPlant(plantCatalogId: string, userId: string) {
    return (this.db.prepare('SELECT * FROM seed_inventory WHERE plant_catalog_id = ? AND user_id = ?').all(plantCatalogId, userId) as any[]).map(r => this.deserialize(r));
  }

  create(data: unknown, userId: string) {
    const parsed = SeedInventoryCreateSchema.parse(data);
    const id = uuid();
    const row: Record<string, any> = { id, ...parsed, user_id: userId };
    if (row.tags) row.tags = JSON.stringify(row.tags);

    return this.db.transaction(() => {
      const created = this.seedRepo.insert(row);
      this.history.logCreate('seed_inventory', created);
      return this.deserialize(created);
    })();
  }

  update(id: string, data: unknown, userId: string) {
    const parsed = SeedInventoryUpdateSchema.parse(data);
    const updateData: Record<string, any> = { ...parsed };
    if (updateData.tags) updateData.tags = JSON.stringify(updateData.tags);

    return this.db.transaction(() => {
      const old = this.db.prepare('SELECT * FROM seed_inventory WHERE id = ? AND user_id = ?').get(id, userId) as any;
      if (!old) throw new NotFoundError('SeedInventory', id);
      const updated = this.seedRepo.update(id, updateData);
      if (!updated) throw new NotFoundError('SeedInventory', id);
      this.history.logUpdate('seed_inventory', id, old, updated);
      return this.deserialize(updated);
    })();
  }

  deductSeeds(id: string, count: number, userId: string) {
    return this.db.transaction(() => {
      const old = this.db.prepare('SELECT * FROM seed_inventory WHERE id = ? AND user_id = ?').get(id, userId) as any;
      if (!old) throw new NotFoundError('SeedInventory', id);
      const newQty = Math.max(0, (old.quantity_packets ?? 0) - count);
      const updated = this.seedRepo.update(id, { quantity_packets: newQty });
      if (!updated) throw new NotFoundError('SeedInventory', id);
      this.history.logUpdate('seed_inventory', id, old, updated);
      return this.deserialize(updated);
    })();
  }

  delete(id: string, userId: string): void {
    this.db.transaction(() => {
      const old = this.db.prepare('SELECT * FROM seed_inventory WHERE id = ? AND user_id = ?').get(id, userId) as any;
      if (!old) throw new NotFoundError('SeedInventory', id);
      this.seedRepo.delete(id);
      this.history.logDelete('seed_inventory', old);
    })();
  }
}
