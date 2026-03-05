import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import { NoteCreateSchema, NoteUpdateSchema } from '@gardenvault/shared';
import type { NoteRepository, NoteRow } from '../db/repositories/note.repository.js';
import type { HistoryLogger } from './history.middleware.js';
import { NotFoundError } from '../utils/errors.js';

export class NoteService {
  constructor(
    private db: Database.Database,
    private noteRepo: NoteRepository,
    private history: HistoryLogger,
  ) {}

  findAll(filters: { pinned?: boolean; limit?: number; offset?: number }) {
    return this.noteRepo.findFiltered(filters).map(r => this.deserialize(r));
  }

  findById(id: string) {
    const row = this.noteRepo.findById(id);
    if (!row) throw new NotFoundError('Note', id);
    return this.deserialize(row);
  }

  findByEntity(entityType: string, entityId: string) {
    return this.noteRepo.findByEntity(entityType, entityId).map(r => this.deserialize(r));
  }

  findByDate(date: string) {
    return this.noteRepo.findByDate(date).map(r => this.deserialize(r));
  }

  create(data: unknown) {
    const parsed = NoteCreateSchema.parse(data);
    const id = uuid();

    const row: Record<string, any> = {
      id,
      ...parsed,
      entity_links: JSON.stringify(parsed.entity_links ?? []),
      photo_ids: JSON.stringify(parsed.photo_ids ?? []),
      tags: JSON.stringify(parsed.tags ?? []),
      pinned: parsed.pinned ? 1 : 0,
    };

    const result = this.db.transaction(() => {
      const created = this.noteRepo.insert(row);
      this.history.logCreate('note', created);
      return created;
    })();

    return this.deserialize(result);
  }

  update(id: string, data: unknown) {
    const parsed = NoteUpdateSchema.parse(data);
    const updateData: Record<string, any> = { ...parsed };

    if (parsed.entity_links !== undefined) updateData.entity_links = JSON.stringify(parsed.entity_links);
    if (parsed.photo_ids !== undefined) updateData.photo_ids = JSON.stringify(parsed.photo_ids);
    if (parsed.tags !== undefined) updateData.tags = JSON.stringify(parsed.tags);
    if (parsed.pinned !== undefined) updateData.pinned = parsed.pinned ? 1 : 0;

    const result = this.db.transaction(() => {
      const old = this.noteRepo.findById(id);
      if (!old) throw new NotFoundError('Note', id);
      const updated = this.noteRepo.update(id, updateData);
      if (!updated) throw new NotFoundError('Note', id);
      this.history.logUpdate('note', id, old, updated);
      return updated;
    })();

    return this.deserialize(result);
  }

  delete(id: string): void {
    this.db.transaction(() => {
      const old = this.noteRepo.findById(id);
      if (!old) throw new NotFoundError('Note', id);
      this.noteRepo.delete(id);
      this.history.logDelete('note', old);
    })();
  }

  private deserialize(row: NoteRow) {
    return {
      ...row,
      entity_links: typeof row.entity_links === 'string' ? JSON.parse(row.entity_links) : row.entity_links,
      photo_ids: typeof row.photo_ids === 'string' ? JSON.parse(row.photo_ids) : row.photo_ids,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags,
      pinned: Boolean(row.pinned),
    };
  }
}
