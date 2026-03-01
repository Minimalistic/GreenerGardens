import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository.js';

export interface TagRow {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface EntityTagRow {
  tag_id: string;
  entity_type: string;
  entity_id: string;
}

export class TagRepository extends BaseRepository<TagRow> {
  constructor(db: Database.Database) {
    super(db, 'tags');
  }

  findByName(name: string): TagRow | undefined {
    return this.db.prepare('SELECT * FROM tags WHERE name = ?').get(name) as TagRow | undefined;
  }

  addEntityTag(tagId: string, entityType: string, entityId: string): void {
    this.db.prepare(
      'INSERT OR IGNORE INTO entity_tags (tag_id, entity_type, entity_id) VALUES (?, ?, ?)'
    ).run(tagId, entityType, entityId);
  }

  removeEntityTag(tagId: string, entityType: string, entityId: string): void {
    this.db.prepare(
      'DELETE FROM entity_tags WHERE tag_id = ? AND entity_type = ? AND entity_id = ?'
    ).run(tagId, entityType, entityId);
  }

  findEntitiesByTag(tagId: string): EntityTagRow[] {
    return this.db.prepare(
      'SELECT * FROM entity_tags WHERE tag_id = ?'
    ).all(tagId) as EntityTagRow[];
  }

  findTagsByEntity(entityType: string, entityId: string): TagRow[] {
    return this.db.prepare(
      `SELECT t.* FROM tags t
       INNER JOIN entity_tags et ON t.id = et.tag_id
       WHERE et.entity_type = ? AND et.entity_id = ?
       ORDER BY t.name`
    ).all(entityType, entityId) as TagRow[];
  }
}
