import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import { PlotCreateSchema, PlotUpdateSchema } from '@gardenvault/shared';
import type { PlotRepository, PlotRow } from '../db/repositories/plot.repository.js';
import type { SubPlotRepository } from '../db/repositories/sub-plot.repository.js';
import type { GardenRepository } from '../db/repositories/garden.repository.js';
import type { HistoryLogger } from './history.middleware.js';
import { NotFoundError } from '../utils/errors.js';

export class PlotService {
  constructor(
    private db: Database.Database,
    private plotRepo: PlotRepository,
    private subPlotRepo: SubPlotRepository,
    private gardenRepo: GardenRepository,
    private history: HistoryLogger,
  ) {}

  findAll() {
    return this.plotRepo.findAll({ orderBy: 'name', orderDir: 'ASC' });
  }

  findById(id: string) {
    const plot = this.plotRepo.findById(id);
    if (!plot) throw new NotFoundError('Plot', id);
    return this.deserializePlot(plot);
  }

  findByGardenId(gardenId: string) {
    return this.plotRepo.findByGardenId(gardenId).map(p => this.deserializePlot(p));
  }

  create(data: unknown): any {
    const parsed = PlotCreateSchema.parse(data);

    // Verify garden exists
    if (!this.gardenRepo.findById(parsed.garden_id)) {
      throw new NotFoundError('Garden', parsed.garden_id);
    }

    const id = uuid();
    const geometry = parsed.geometry ?? { x: 50, y: 50, width: 120, height: 80, rotation: 0 };

    const row: Record<string, any> = {
      id,
      garden_id: parsed.garden_id,
      name: parsed.name,
      plot_type: parsed.plot_type,
      dimensions_json: JSON.stringify(parsed.dimensions),
      geometry_json: JSON.stringify(geometry),
      soil_type: parsed.soil_type ?? null,
      sun_exposure: parsed.sun_exposure ?? null,
      irrigation: parsed.irrigation ?? null,
      is_covered: parsed.is_covered ? 1 : 0,
      tags: JSON.stringify(parsed.tags ?? []),
      notes: parsed.notes ?? null,
    };

    const result = this.db.transaction(() => {
      const created = this.plotRepo.insert(row);
      this.history.logCreate('plot', created);
      return this.deserializePlot(created);
    })();

    return result;
  }

  update(id: string, data: unknown): any {
    const parsed = PlotUpdateSchema.parse(data);

    const result = this.db.transaction(() => {
      const old = this.plotRepo.findById(id);
      if (!old) throw new NotFoundError('Plot', id);

      const updateData: Record<string, any> = {};
      if (parsed.name !== undefined) updateData.name = parsed.name;
      if (parsed.plot_type !== undefined) updateData.plot_type = parsed.plot_type;
      if (parsed.dimensions !== undefined) updateData.dimensions_json = JSON.stringify(parsed.dimensions);
      if (parsed.geometry !== undefined) updateData.geometry_json = JSON.stringify(parsed.geometry);
      if (parsed.soil_type !== undefined) updateData.soil_type = parsed.soil_type;
      if (parsed.sun_exposure !== undefined) updateData.sun_exposure = parsed.sun_exposure;
      if (parsed.irrigation !== undefined) updateData.irrigation = parsed.irrigation;
      if (parsed.is_covered !== undefined) updateData.is_covered = parsed.is_covered ? 1 : 0;
      if (parsed.tags !== undefined) updateData.tags = JSON.stringify(parsed.tags);
      if (parsed.notes !== undefined) updateData.notes = parsed.notes;

      const updated = this.plotRepo.update(id, updateData);
      if (!updated) throw new NotFoundError('Plot', id);

      this.history.logUpdate('plot', id, old, updated);
      return this.deserializePlot(updated);
    })();

    return result;
  }

  delete(id: string): void {
    this.db.transaction(() => {
      const old = this.plotRepo.findById(id);
      if (!old) throw new NotFoundError('Plot', id);

      this.plotRepo.delete(id);
      this.history.logDelete('plot', old);
    })();
  }

  private deserializePlot(row: PlotRow): any {
    return {
      ...row,
      dimensions: JSON.parse(row.dimensions_json),
      geometry: JSON.parse(row.geometry_json),
      is_covered: Boolean(row.is_covered),
      tags: JSON.parse(row.tags || '[]'),
    };
  }
}
