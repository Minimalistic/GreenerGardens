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
    return this.gardenRepo.findAll({ orderBy: 'name', orderDir: 'ASC' }).map(g => this.deserialize(g));
  }

  findById(id: string) {
    const garden = this.gardenRepo.findById(id);
    if (!garden) throw new NotFoundError('Garden', id);
    return this.deserialize(garden);
  }

  create(data: unknown) {
    const parsed = GardenCreateSchema.parse(data);
    const id = uuid();

    const row: Record<string, any> = {
      id,
      ...parsed,
      settings: parsed.settings ? JSON.stringify(parsed.settings) : '{}',
    };

    const result = this.db.transaction(() => {
      const created = this.gardenRepo.insert(row);
      this.history.logCreate('garden', created);
      return this.deserialize(created);
    })();

    return result;
  }

  update(id: string, data: unknown) {
    const parsed = GardenUpdateSchema.parse(data);

    const updateData: Record<string, any> = { ...parsed };
    if (parsed.settings !== undefined) {
      updateData.settings = JSON.stringify(parsed.settings);
    }

    const result = this.db.transaction(() => {
      const old = this.gardenRepo.findById(id);
      if (!old) throw new NotFoundError('Garden', id);

      const updated = this.gardenRepo.update(id, updateData);
      if (!updated) throw new NotFoundError('Garden', id);

      this.history.logUpdate('garden', id, old, updated);
      return this.deserialize(updated);
    })();

    return result;
  }

  getDeletionImpact(id: string) {
    const garden = this.gardenRepo.findById(id);
    if (!garden) throw new NotFoundError('Garden', id);
    return this.gardenRepo.getDeletionImpact(id);
  }

  delete(id: string): void {
    this.db.transaction(() => {
      const old = this.gardenRepo.findById(id);
      if (!old) throw new NotFoundError('Garden', id);

      // Clean up orphan-prone polymorphic records before cascade delete
      this.cleanupOrphans(id);

      this.gardenRepo.delete(id);
      this.history.logDelete('garden', old);
    })();
  }

  private cleanupOrphans(gardenId: string): void {
    const orphanTables = ['tasks', 'pest_events', 'uploads', 'cost_entries', 'entity_tags'];

    // Delete records referencing the garden itself
    for (const table of orphanTables) {
      this.db.prepare(
        `DELETE FROM ${table} WHERE entity_type = 'garden' AND entity_id = ?`
      ).run(gardenId);
    }

    // Delete records referencing plots in this garden
    for (const table of orphanTables) {
      this.db.prepare(
        `DELETE FROM ${table} WHERE entity_type = 'plot' AND entity_id IN (SELECT id FROM plots WHERE garden_id = ?)`
      ).run(gardenId);
    }

    // Delete records referencing plant instances in plots of this garden
    for (const table of orphanTables) {
      this.db.prepare(
        `DELETE FROM ${table} WHERE entity_type = 'plant_instance' AND entity_id IN (SELECT id FROM plant_instances WHERE plot_id IN (SELECT id FROM plots WHERE garden_id = ?))`
      ).run(gardenId);
    }

    // Delete notes with entity_links referencing this garden, its plots, or their plant instances
    this.db.prepare(`
      DELETE FROM notes WHERE id IN (
        SELECT DISTINCT n.id FROM notes n, json_each(n.entity_links) je
        WHERE (json_extract(je.value, '$.entity_type') = 'garden' AND json_extract(je.value, '$.entity_id') = ?)
           OR (json_extract(je.value, '$.entity_type') = 'plot' AND json_extract(je.value, '$.entity_id') IN (SELECT id FROM plots WHERE garden_id = ?))
           OR (json_extract(je.value, '$.entity_type') = 'plant_instance' AND json_extract(je.value, '$.entity_id') IN (SELECT id FROM plant_instances WHERE plot_id IN (SELECT id FROM plots WHERE garden_id = ?)))
      )
    `).run(gardenId, gardenId, gardenId);
  }

  private deserialize(row: GardenRow) {
    return {
      ...row,
      settings: JSON.parse(row.settings || '{}'),
    };
  }
}
