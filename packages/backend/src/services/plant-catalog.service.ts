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
    zone?: number;
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

  getActivity(catalogId: string) {
    // 1. All plantings for this catalog entry
    const plantings = this.db.prepare(`
      SELECT pi.id, pi.variety_name, pi.status, pi.date_planted, pi.quantity,
             p.name AS plot_name
      FROM plant_instances pi
      JOIN plots p ON p.id = pi.plot_id
      WHERE pi.plant_catalog_id = ?
      ORDER BY pi.date_planted DESC
    `).all(catalogId) as { id: string; variety_name: string | null; status: string; date_planted: string | null; quantity: number; plot_name: string }[];

    const instanceIds = plantings.map(r => r.id);

    let harvests: { id: string; plant_instance_id: string; date_harvested: string; quantity: number; unit: string; quality: string; variety_name: string | null; plot_name: string }[] = [];
    let tasks: { id: string; title: string; status: string; priority: string; due_date: string | null; entity_id: string }[] = [];
    let pestEvents: { id: string; pest_name: string; severity: string; outcome: string; detected_date: string; entity_id: string }[] = [];
    let harvestTotal = 0;
    let taskTotal = 0;
    let pestTotal = 0;

    if (instanceIds.length > 0) {
      const placeholders = instanceIds.map(() => '?').join(',');

      // 2a. Harvests
      harvestTotal = (this.db.prepare(`
        SELECT COUNT(*) AS cnt FROM harvests WHERE plant_instance_id IN (${placeholders})
      `).get(...instanceIds) as { cnt: number }).cnt;

      harvests = this.db.prepare(`
        SELECT h.id, h.plant_instance_id, h.date_harvested, h.quantity, h.unit, h.quality,
               pi.variety_name, p.name AS plot_name
        FROM harvests h
        JOIN plant_instances pi ON pi.id = h.plant_instance_id
        JOIN plots p ON p.id = h.plot_id
        WHERE h.plant_instance_id IN (${placeholders})
        ORDER BY h.date_harvested DESC
        LIMIT 10
      `).all(...instanceIds) as typeof harvests;

      // 2b. Tasks
      taskTotal = (this.db.prepare(`
        SELECT COUNT(*) AS cnt FROM tasks WHERE entity_type = 'plant_instance' AND entity_id IN (${placeholders})
      `).get(...instanceIds) as { cnt: number }).cnt;

      tasks = this.db.prepare(`
        SELECT t.id, t.title, t.status, t.priority, t.due_date, t.entity_id
        FROM tasks t
        WHERE t.entity_type = 'plant_instance' AND t.entity_id IN (${placeholders})
        ORDER BY
          CASE t.status WHEN 'in_progress' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
          t.due_date ASC
        LIMIT 10
      `).all(...instanceIds) as typeof tasks;

      // 2c. Pest events
      pestTotal = (this.db.prepare(`
        SELECT COUNT(*) AS cnt FROM pest_events WHERE entity_type = 'plant_instance' AND entity_id IN (${placeholders})
      `).get(...instanceIds) as { cnt: number }).cnt;

      pestEvents = this.db.prepare(`
        SELECT pe.id, pe.pest_name, pe.severity, pe.outcome, pe.detected_date, pe.entity_id
        FROM pest_events pe
        WHERE pe.entity_type = 'plant_instance' AND pe.entity_id IN (${placeholders})
        ORDER BY pe.detected_date DESC
        LIMIT 10
      `).all(...instanceIds) as typeof pestEvents;
    }

    // 3. Seed inventory (direct link to catalog, no instances needed)
    const seeds = this.db.prepare(`
      SELECT id, variety_name, brand, quantity_packets, quantity_seeds_approx, expiration_date
      FROM seed_inventory
      WHERE plant_catalog_id = ?
      ORDER BY expiration_date DESC
    `).all(catalogId) as { id: string; variety_name: string; brand: string | null; quantity_packets: number; quantity_seeds_approx: number | null; expiration_date: string | null }[];

    return {
      counts: {
        plantings: plantings.length,
        harvests: harvestTotal,
        tasks: taskTotal,
        pest_events: pestTotal,
        seeds: seeds.length,
      },
      plantings,
      harvests,
      tasks,
      pest_events: pestEvents,
      seeds,
    };
  }

  private deserialize(row: PlantCatalogRow) {
    return {
      ...row,
      companions: JSON.parse(row.companions_json || '[]'),
      antagonists: JSON.parse(row.antagonists_json || '[]'),
      growing_tips: JSON.parse(row.growing_tips_json || '[]'),
      common_pests: JSON.parse(row.common_pests || '[]'),
      common_diseases: JSON.parse(row.common_diseases || '[]'),
      disease_resistance: JSON.parse(row.disease_resistance || '{}'),
    };
  }
}
