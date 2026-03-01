import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import { PestEventCreateSchema, PestEventUpdateSchema } from '@gardenvault/shared';
import type { PestEventRepository } from '../db/repositories/pest-event.repository.js';
import type { HistoryLogger } from './history.middleware.js';
import { NotFoundError } from '../utils/errors.js';

export class PestEventService {
  constructor(
    private db: Database.Database,
    private pestEventRepo: PestEventRepository,
    private history: HistoryLogger,
  ) {}

  findAll(filters: {
    entity_type?: string;
    entity_id?: string;
    pest_type?: string;
    outcome?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.pestEventRepo.findFiltered(filters).map(r => this.deserialize(r));
  }

  findById(id: string) {
    const row = this.pestEventRepo.findById(id);
    if (!row) throw new NotFoundError('PestEvent', id);
    return this.deserialize(row);
  }

  findByEntity(entityType: string, entityId: string) {
    return this.pestEventRepo.findByEntity(entityType, entityId).map(r => this.deserialize(r));
  }

  create(data: unknown) {
    const parsed = PestEventCreateSchema.parse(data);
    const id = uuid();

    const row: Record<string, any> = {
      id,
      ...parsed,
      photos: JSON.stringify(parsed.photos ?? []),
    };

    const result = this.db.transaction(() => {
      const created = this.pestEventRepo.insert(row);
      this.history.logCreate('pest_event', created);
      return created;
    })();

    return this.deserialize(result);
  }

  update(id: string, data: unknown) {
    const parsed = PestEventUpdateSchema.parse(data);
    const updateData: Record<string, any> = { ...parsed };

    if (parsed.photos !== undefined) {
      updateData.photos = JSON.stringify(parsed.photos);
    }

    const result = this.db.transaction(() => {
      const old = this.pestEventRepo.findById(id);
      if (!old) throw new NotFoundError('PestEvent', id);
      const updated = this.pestEventRepo.update(id, updateData);
      if (!updated) throw new NotFoundError('PestEvent', id);
      this.history.logUpdate('pest_event', id, old, updated);
      return updated;
    })();

    return this.deserialize(result);
  }

  delete(id: string): void {
    this.db.transaction(() => {
      const old = this.pestEventRepo.findById(id);
      if (!old) throw new NotFoundError('PestEvent', id);
      this.pestEventRepo.delete(id);
      this.history.logDelete('pest_event', old);
    })();
  }

  private deserialize(row: Record<string, any>) {
    return {
      ...row,
      photos: typeof row.photos === 'string' ? JSON.parse(row.photos) : row.photos,
    };
  }
}
