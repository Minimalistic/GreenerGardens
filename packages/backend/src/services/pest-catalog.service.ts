import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import { PestCatalogCreateSchema, PestCatalogUpdateSchema } from '@gardenvault/shared';
import type { PestCatalogRepository, PestCatalogRow } from '../db/repositories/pest-catalog.repository.js';
import type { HistoryLogger } from './history.middleware.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

const JSON_FIELDS = [
  'appearance',
  'symptoms',
  'affected_plants',
  'favorable_conditions',
  'prevention',
  'organic_treatments',
  'chemical_treatments',
  'biological_treatments',
  'cultural_treatments',
] as const;

export class PestCatalogService {
  constructor(
    private db: Database.Database,
    private pestRepo: PestCatalogRepository,
    private history: HistoryLogger,
  ) {}

  search(params: {
    search?: string;
    category?: string;
    severity?: string;
    affected_plant?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    const { data, total } = this.pestRepo.search({
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
    const row = this.pestRepo.findById(id);
    if (!row) return null;
    return this.deserialize(row);
  }

  findByAffectedPlant(plantName: string) {
    const { data } = this.pestRepo.search({
      affected_plant: plantName,
      limit: 100,
      offset: 0,
    });
    return data.map(row => this.deserialize(row));
  }

  create(data: unknown) {
    const parsed = PestCatalogCreateSchema.parse(data);
    const id = uuid();

    const row: Record<string, any> = {
      id,
      ...parsed,
      is_custom: 1,
    };

    for (const field of JSON_FIELDS) {
      if (parsed[field] !== undefined) {
        row[`${field}_json`] = JSON.stringify(parsed[field]);
      }
      delete row[field];
    }

    const result = this.db.transaction(() => {
      const created = this.pestRepo.insert(row);
      this.history.logCreate('pest_catalog', created);
      return this.deserialize(created);
    })();

    return result;
  }

  update(id: string, data: unknown) {
    const existing = this.pestRepo.findById(id);
    if (!existing) throw new NotFoundError('PestCatalog', id);
    if (!existing.is_custom) throw new ValidationError('Only custom pest entries can be edited');

    const parsed = PestCatalogUpdateSchema.parse(data);

    const updateData: Record<string, any> = { ...parsed };
    for (const field of JSON_FIELDS) {
      if (parsed[field] !== undefined) {
        updateData[`${field}_json`] = JSON.stringify(parsed[field]);
      }
      delete updateData[field];
    }

    const result = this.db.transaction(() => {
      const updated = this.pestRepo.update(id, updateData);
      if (updated) this.history.logUpdate('pest_catalog', id, existing, updated);
      return updated ? this.deserialize(updated) : null;
    })();

    return result;
  }

  remove(id: string) {
    const existing = this.pestRepo.findById(id);
    if (!existing) throw new NotFoundError('PestCatalog', id);
    if (!existing.is_custom) throw new ValidationError('Only custom pest entries can be deleted');

    this.db.transaction(() => {
      this.history.logDelete('pest_catalog', existing);
      this.pestRepo.delete(id);
    })();
  }

  private deserialize(row: PestCatalogRow) {
    return {
      ...row,
      appearance: JSON.parse(row.appearance_json || '[]'),
      symptoms: JSON.parse(row.symptoms_json || '[]'),
      affected_plants: JSON.parse(row.affected_plants_json || '[]'),
      favorable_conditions: JSON.parse(row.favorable_conditions_json || '[]'),
      prevention: JSON.parse(row.prevention_json || '[]'),
      organic_treatments: JSON.parse(row.organic_treatments_json || '[]'),
      chemical_treatments: JSON.parse(row.chemical_treatments_json || '[]'),
      biological_treatments: JSON.parse(row.biological_treatments_json || '[]'),
      cultural_treatments: JSON.parse(row.cultural_treatments_json || '[]'),
    };
  }
}
