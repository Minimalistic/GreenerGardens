import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import { TagCreateSchema, TagUpdateSchema } from '@gardenvault/shared';
import type { TagRepository } from '../db/repositories/tag.repository.js';
import { NotFoundError } from '../utils/errors.js';

export class TagService {
  constructor(
    private db: Database.Database,
    private tagRepo: TagRepository,
  ) {}

  findAll(userId: string) {
    return this.db.prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC').all(userId) as any[];
  }

  findById(id: string, userId: string) {
    const tag = this.db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(id, userId) as any;
    if (!tag) throw new NotFoundError('Tag', id);
    return tag;
  }

  create(data: unknown, userId: string) {
    const parsed = TagCreateSchema.parse(data);
    const id = uuid();
    return this.tagRepo.insert({ id, ...parsed, user_id: userId });
  }

  update(id: string, data: unknown, userId: string) {
    // Verify ownership first
    this.findById(id, userId);
    const parsed = TagUpdateSchema.parse(data);
    const result = this.tagRepo.update(id, parsed);
    if (!result) throw new NotFoundError('Tag', id);
    return result;
  }

  delete(id: string, userId: string): void {
    this.findById(id, userId);
    this.tagRepo.delete(id);
  }

  addEntityTag(tagId: string, entityType: string, entityId: string, userId: string) {
    this.findById(tagId, userId);
    this.tagRepo.addEntityTag(tagId, entityType, entityId);
  }

  removeEntityTag(tagId: string, entityType: string, entityId: string, userId: string) {
    this.findById(tagId, userId);
    this.tagRepo.removeEntityTag(tagId, entityType, entityId);
  }

  findEntitiesByTag(tagId: string, userId: string) {
    this.findById(tagId, userId);
    return this.tagRepo.findEntitiesByTag(tagId);
  }

  findTagsByEntity(entityType: string, entityId: string) {
    return this.tagRepo.findTagsByEntity(entityType, entityId);
  }
}
