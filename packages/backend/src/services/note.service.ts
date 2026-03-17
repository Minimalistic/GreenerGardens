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

  findAll(userId: string, filters: { pinned?: boolean; limit?: number; offset?: number }) {
    // Scope to user's notes
    const conditions: string[] = ['user_id = ?'];
    const params: any[] = [userId];
    if (filters.pinned !== undefined) {
      conditions.push('pinned = ?');
      params.push(filters.pinned ? 1 : 0);
    }
    const where = conditions.join(' AND ');
    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;
    params.push(limit, offset);
    const rows = this.db.prepare(
      `SELECT * FROM notes WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params) as NoteRow[];
    return rows.map(r => this.deserialize(r));
  }

  findById(id: string, userId: string) {
    const row = this.db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(id, userId) as NoteRow | undefined;
    if (!row) throw new NotFoundError('Note', id);
    return this.deserialize(row);
  }

  findByEntity(entityType: string, entityId: string, userId: string) {
    return this.noteRepo.findByEntity(entityType, entityId)
      .filter((r: NoteRow) => (r as any).user_id === userId)
      .map(r => this.deserialize(r));
  }

  findByDate(date: string, userId: string) {
    const rows = this.db.prepare(
      `SELECT * FROM notes WHERE user_id = ? AND date(COALESCE(note_date, created_at)) = date(?) ORDER BY created_at DESC`
    ).all(userId, date) as NoteRow[];
    return rows.map(r => this.deserialize(r));
  }

  create(data: unknown, userId: string) {
    const parsed = NoteCreateSchema.parse(data);
    const id = uuid();

    const row: Record<string, any> = {
      id,
      ...parsed,
      user_id: userId,
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

  update(id: string, data: unknown, userId: string) {
    const parsed = NoteUpdateSchema.parse(data);
    const updateData: Record<string, any> = { ...parsed };

    if (parsed.entity_links !== undefined) updateData.entity_links = JSON.stringify(parsed.entity_links);
    if (parsed.photo_ids !== undefined) updateData.photo_ids = JSON.stringify(parsed.photo_ids);
    if (parsed.tags !== undefined) updateData.tags = JSON.stringify(parsed.tags);
    if (parsed.pinned !== undefined) updateData.pinned = parsed.pinned ? 1 : 0;

    const result = this.db.transaction(() => {
      const old = this.db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(id, userId) as NoteRow | undefined;
      if (!old) throw new NotFoundError('Note', id);
      const updated = this.noteRepo.update(id, updateData);
      if (!updated) throw new NotFoundError('Note', id);
      this.history.logUpdate('note', id, old, updated);
      return updated;
    })();

    return this.deserialize(result);
  }

  delete(id: string, userId: string): void {
    this.db.transaction(() => {
      const old = this.db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(id, userId) as NoteRow | undefined;
      if (!old) throw new NotFoundError('Note', id);
      this.noteRepo.delete(id);
      this.history.logDelete('note', old);
    })();
  }

  findByContext(entityType: string, entityId: string) {
    const rows = this.noteRepo.findByContext(entityType, entityId);

    // Group by context entity, deduplicating notes
    const seenNoteIds = new Set<string>();
    const groupMap = new Map<string, { entity_type: string; entity_id: string; entity_name: string; notes: any[] }>();

    for (const row of rows) {
      const key = `${row.context_entity_type}:${row.context_entity_id}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          entity_type: row.context_entity_type,
          entity_id: row.context_entity_id,
          entity_name: row.context_entity_name,
          notes: [],
        });
      }
      if (!seenNoteIds.has(row.id)) {
        seenNoteIds.add(row.id);
        groupMap.get(key)!.notes.push(this.deserialize(row));
      }
    }

    // Sort: "self" group first, then alphabetically by entity name
    const groups = Array.from(groupMap.values()).sort((a, b) => {
      const aIsSelf = a.entity_type === entityType && a.entity_id === entityId;
      const bIsSelf = b.entity_type === entityType && b.entity_id === entityId;
      if (aIsSelf && !bIsSelf) return -1;
      if (!aIsSelf && bIsSelf) return 1;
      return a.entity_name.localeCompare(b.entity_name);
    });

    return { groups, total: seenNoteIds.size };
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
