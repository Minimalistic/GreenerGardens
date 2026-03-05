import type Database from 'better-sqlite3';
import { BaseRepository, type SqlParam } from './base.repository.js';

export interface NoteRow {
  id: string;
  content: string;
  content_type: string;
  entity_links: string;
  photo_ids: string;
  tags: string;
  pinned: number;
  note_date: string | null;
  created_at: string;
  updated_at: string;
}

export class NoteRepository extends BaseRepository<NoteRow> {
  constructor(db: Database.Database) {
    super(db, 'notes');
  }

  findFiltered(filters: {
    pinned?: boolean;
    limit?: number;
    offset?: number;
  }): NoteRow[] {
    const conditions: string[] = [];
    const params: SqlParam[] = [];

    if (filters.pinned !== undefined) {
      conditions.push('pinned = ?');
      params.push(filters.pinned ? 1 : 0);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    return this.db.prepare(
      `SELECT * FROM notes ${where} ORDER BY pinned DESC, created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as NoteRow[];
  }

  findByEntity(entityType: string, entityId: string): NoteRow[] {
    // Search in entity_links JSON array for matching entity
    return this.db.prepare(
      `SELECT * FROM notes WHERE entity_links LIKE ? ORDER BY pinned DESC, created_at DESC`
    ).all(`%"entity_id":"${entityId}"%`) as NoteRow[];
  }

  findByDate(date: string): NoteRow[] {
    return this.db.prepare(
      'SELECT * FROM notes WHERE note_date = ? ORDER BY pinned DESC, created_at DESC'
    ).all(date) as NoteRow[];
  }

  search(query: string, limit = 50): NoteRow[] {
    return this.db.prepare(
      'SELECT * FROM notes WHERE content LIKE ? ORDER BY created_at DESC LIMIT ?'
    ).all(`%${query}%`, limit) as NoteRow[];
  }

  /**
   * Find notes linked to an entity and all its children.
   * - garden: notes on garden + its plots + plant instances in those plots
   * - plot: notes on plot + plant instances in that plot
   */
  findByContext(entityType: string, entityId: string): (NoteRow & { context_entity_type: string; context_entity_id: string; context_entity_name: string })[] {
    if (entityType === 'garden') {
      return this.db.prepare(`
        SELECT n.*, je.value->>'entity_type' AS context_entity_type,
               je.value->>'entity_id' AS context_entity_id,
               CASE
                 WHEN je.value->>'entity_type' = 'garden' THEN 'Garden'
                 WHEN je.value->>'entity_type' = 'plot' THEN COALESCE(p.name, 'Plot')
                 WHEN je.value->>'entity_type' = 'plant_instance' THEN COALESCE(pc.common_name, pi.id, 'Plant')
                 ELSE je.value->>'entity_type'
               END AS context_entity_name
        FROM notes n, json_each(n.entity_links) je
        LEFT JOIN plots p ON je.value->>'entity_type' = 'plot' AND je.value->>'entity_id' = p.id
        LEFT JOIN plant_instances pi ON je.value->>'entity_type' = 'plant_instance' AND je.value->>'entity_id' = pi.id
        LEFT JOIN plant_catalog pc ON pi.plant_catalog_id = pc.id
        WHERE (
          (je.value->>'entity_type' = 'garden' AND je.value->>'entity_id' = ?)
          OR (je.value->>'entity_type' = 'plot' AND je.value->>'entity_id' IN (
            SELECT id FROM plots WHERE garden_id = ?
          ))
          OR (je.value->>'entity_type' = 'plant_instance' AND je.value->>'entity_id' IN (
            SELECT pi2.id FROM plant_instances pi2
            JOIN sub_plots sp ON pi2.sub_plot_id = sp.id
            JOIN plots p2 ON sp.plot_id = p2.id
            WHERE p2.garden_id = ?
          ))
        )
        ORDER BY n.pinned DESC, n.created_at DESC
      `).all(entityId, entityId, entityId) as any[];
    }

    if (entityType === 'plot') {
      return this.db.prepare(`
        SELECT n.*, je.value->>'entity_type' AS context_entity_type,
               je.value->>'entity_id' AS context_entity_id,
               CASE
                 WHEN je.value->>'entity_type' = 'plot' THEN COALESCE(p.name, 'Plot')
                 WHEN je.value->>'entity_type' = 'plant_instance' THEN COALESCE(pc.common_name, pi.id, 'Plant')
                 ELSE je.value->>'entity_type'
               END AS context_entity_name
        FROM notes n, json_each(n.entity_links) je
        LEFT JOIN plots p ON je.value->>'entity_type' = 'plot' AND je.value->>'entity_id' = p.id
        LEFT JOIN plant_instances pi ON je.value->>'entity_type' = 'plant_instance' AND je.value->>'entity_id' = pi.id
        LEFT JOIN plant_catalog pc ON pi.plant_catalog_id = pc.id
        WHERE (
          (je.value->>'entity_type' = 'plot' AND je.value->>'entity_id' = ?)
          OR (je.value->>'entity_type' = 'plant_instance' AND je.value->>'entity_id' IN (
            SELECT pi2.id FROM plant_instances pi2
            JOIN sub_plots sp ON pi2.sub_plot_id = sp.id
            WHERE sp.plot_id = ?
          ))
        )
        ORDER BY n.pinned DESC, n.created_at DESC
      `).all(entityId, entityId) as any[];
    }

    // Fallback: just find notes for this specific entity
    return this.findByEntity(entityType, entityId).map(r => ({
      ...r,
      context_entity_type: entityType,
      context_entity_id: entityId,
      context_entity_name: entityType,
    }));
  }
}
