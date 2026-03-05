import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import { GardenObjectCreateSchema, GardenObjectUpdateSchema } from '@gardenvault/shared';
import type { GardenObjectRepository, GardenObjectRow } from '../db/repositories/garden-object.repository.js';
import type { HistoryLogger } from './history.middleware.js';
import { NotFoundError } from '../utils/errors.js';

export class GardenObjectService {
  constructor(
    private db: Database.Database,
    private repo: GardenObjectRepository,
    private history: HistoryLogger,
  ) {}

  findByGardenId(gardenId: string) {
    return this.repo.findByGardenId(gardenId).map(r => this.deserialize(r));
  }

  findById(id: string) {
    const row = this.repo.findById(id);
    if (!row) throw new NotFoundError('GardenObject', id);
    return this.deserialize(row);
  }

  create(data: unknown) {
    const parsed = GardenObjectCreateSchema.parse(data);
    const id = uuid();

    const row: Record<string, unknown> = {
      id,
      garden_id: parsed.garden_id,
      name: parsed.name,
      object_type: parsed.object_type,
      geometry_json: JSON.stringify(parsed.geometry ?? { x: 40, y: 40, width: 120, height: 80, rotation: 0 }),
      color: parsed.color ?? null,
      opacity: parsed.opacity,
      label_visible: parsed.label_visible ? 1 : 0,
      z_index: parsed.z_index,
    };

    const result = this.db.transaction(() => {
      const created = this.repo.insert(row);
      this.history.logCreate('garden_object', created);
      return this.deserialize(created);
    })();

    return result;
  }

  update(id: string, data: unknown) {
    const parsed = GardenObjectUpdateSchema.parse(data);

    const updateData: Record<string, unknown> = {};
    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.object_type !== undefined) updateData.object_type = parsed.object_type;
    if (parsed.geometry !== undefined) updateData.geometry_json = JSON.stringify(parsed.geometry);
    if (parsed.color !== undefined) updateData.color = parsed.color;
    if (parsed.opacity !== undefined) updateData.opacity = parsed.opacity;
    if (parsed.label_visible !== undefined) updateData.label_visible = parsed.label_visible ? 1 : 0;
    if (parsed.z_index !== undefined) updateData.z_index = parsed.z_index;

    const result = this.db.transaction(() => {
      const old = this.repo.findById(id);
      if (!old) throw new NotFoundError('GardenObject', id);

      const updated = this.repo.update(id, updateData);
      if (!updated) throw new NotFoundError('GardenObject', id);

      this.history.logUpdate('garden_object', id, old, updated);
      return this.deserialize(updated);
    })();

    return result;
  }

  delete(id: string): void {
    this.db.transaction(() => {
      const old = this.repo.findById(id);
      if (!old) throw new NotFoundError('GardenObject', id);

      this.repo.delete(id);
      this.history.logDelete('garden_object', old);
    })();
  }

  private deserialize(row: GardenObjectRow) {
    return {
      id: row.id,
      garden_id: row.garden_id,
      name: row.name,
      object_type: row.object_type,
      geometry: JSON.parse(row.geometry_json),
      color: row.color,
      opacity: row.opacity,
      label_visible: !!row.label_visible,
      z_index: row.z_index,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
