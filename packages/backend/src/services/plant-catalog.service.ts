import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import { PlantCatalogCreateSchema, PlantCatalogUpdateSchema } from '@gardenvault/shared';
import type { PlantCatalogRepository, PlantCatalogRow } from '../db/repositories/plant-catalog.repository.js';
import type { HistoryLogger } from './history.middleware.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

export class PlantCatalogService {
  constructor(
    private db: Database.Database,
    private catalogRepo: PlantCatalogRepository,
    private history: HistoryLogger,
  ) {}

  search(params: {
    search?: string;
    plant_type?: string;
    lifecycle?: string;
    sun_exposure?: string;
    water_needs?: string;
    min_zone?: number;
    max_zone?: number;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    const { data, total } = this.catalogRepo.search({
      ...params,
      limit,
      offset,
    });

    return {
      data: data.map(row => this.deserialize(row)),
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  findById(id: string) {
    const row = this.catalogRepo.findById(id);
    if (!row) return null;
    return this.deserialize(row);
  }

  create(data: unknown) {
    const parsed = PlantCatalogCreateSchema.parse(data);
    const id = uuid();

    const row: Record<string, any> = {
      id,
      ...parsed,
      companions_json: JSON.stringify(parsed.companions ?? []),
      antagonists_json: JSON.stringify(parsed.antagonists ?? []),
      growing_tips_json: JSON.stringify(parsed.growing_tips ?? []),
      is_custom: 1,
    };
    delete row.companions;
    delete row.antagonists;
    delete row.growing_tips;

    const result = this.db.transaction(() => {
      const created = this.catalogRepo.insert(row);
      this.history.logCreate('plant_catalog', created);
      return this.deserialize(created);
    })();

    return result;
  }

  update(id: string, data: unknown) {
    const existing = this.catalogRepo.findById(id);
    if (!existing) throw new NotFoundError('PlantCatalog', id);
    if (!existing.is_custom) throw new ValidationError('Only custom plants can be edited');

    const parsed = PlantCatalogUpdateSchema.parse(data);

    const updateData: Record<string, any> = { ...parsed };
    if (parsed.companions !== undefined) {
      updateData.companions_json = JSON.stringify(parsed.companions);
      delete updateData.companions;
    }
    if (parsed.antagonists !== undefined) {
      updateData.antagonists_json = JSON.stringify(parsed.antagonists);
      delete updateData.antagonists;
    }
    if (parsed.growing_tips !== undefined) {
      updateData.growing_tips_json = JSON.stringify(parsed.growing_tips);
      delete updateData.growing_tips;
    }

    const result = this.db.transaction(() => {
      const updated = this.catalogRepo.update(id, updateData);
      if (updated) this.history.logUpdate('plant_catalog', id, existing, updated);
      return updated ? this.deserialize(updated) : null;
    })();

    return result;
  }

  remove(id: string) {
    const existing = this.catalogRepo.findById(id);
    if (!existing) throw new NotFoundError('PlantCatalog', id);
    if (!existing.is_custom) throw new ValidationError('Only custom plants can be deleted');

    this.db.transaction(() => {
      this.history.logDelete('plant_catalog', existing);
      this.catalogRepo.delete(id);
    })();
  }

  private deserialize(row: PlantCatalogRow) {
    return {
      ...row,
      companions: JSON.parse(row.companions_json || '[]'),
      antagonists: JSON.parse(row.antagonists_json || '[]'),
      growing_tips: JSON.parse(row.growing_tips_json || '[]'),
    };
  }
}
