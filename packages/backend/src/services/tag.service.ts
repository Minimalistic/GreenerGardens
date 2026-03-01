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

  findAll() {
    return this.tagRepo.findAll({ orderBy: 'name', orderDir: 'ASC' });
  }

  findById(id: string) {
    const tag = this.tagRepo.findById(id);
    if (!tag) throw new NotFoundError('Tag', id);
    return tag;
  }

  create(data: unknown) {
    const parsed = TagCreateSchema.parse(data);
    const id = uuid();
    return this.tagRepo.insert({ id, ...parsed });
  }

  update(id: string, data: unknown) {
    const parsed = TagUpdateSchema.parse(data);
    const result = this.tagRepo.update(id, parsed);
    if (!result) throw new NotFoundError('Tag', id);
    return result;
  }

  delete(id: string): void {
    const tag = this.tagRepo.findById(id);
    if (!tag) throw new NotFoundError('Tag', id);
    this.tagRepo.delete(id);
  }

  addEntityTag(tagId: string, entityType: string, entityId: string) {
    const tag = this.tagRepo.findById(tagId);
    if (!tag) throw new NotFoundError('Tag', tagId);
    this.tagRepo.addEntityTag(tagId, entityType, entityId);
  }

  removeEntityTag(tagId: string, entityType: string, entityId: string) {
    this.tagRepo.removeEntityTag(tagId, entityType, entityId);
  }

  findEntitiesByTag(tagId: string) {
    const tag = this.tagRepo.findById(tagId);
    if (!tag) throw new NotFoundError('Tag', tagId);
    return this.tagRepo.findEntitiesByTag(tagId);
  }

  findTagsByEntity(entityType: string, entityId: string) {
    return this.tagRepo.findTagsByEntity(entityType, entityId);
  }
}
