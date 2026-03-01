import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import { SubPlotCreateSchema, SubPlotUpdateSchema } from '@gardenvault/shared';
import type { SubPlotRepository, SubPlotRow, SubPlotWithPlantRow } from '../db/repositories/sub-plot.repository.js';
import type { HistoryLogger } from './history.middleware.js';
import { NotFoundError } from '../utils/errors.js';

const DEFAULT_GEOMETRY = { x: 0, y: 0, width: 40, height: 40, rotation: 0 };

export class SubPlotService {
  constructor(
    private db: Database.Database,
    private subPlotRepo: SubPlotRepository,
    private history: HistoryLogger,
  ) {}

  findAll() {
    return this.subPlotRepo.findAll();
  }

  findById(id: string) {
    const sub = this.subPlotRepo.findById(id);
    if (!sub) throw new NotFoundError('SubPlot', id);
    return this.deserialize(sub);
  }

  findByPlotId(plotId: string) {
    return this.subPlotRepo.findByPlotId(plotId).map(s => this.deserialize(s));
  }

  findByPlotIdWithPlantInfo(plotId: string) {
    return this.subPlotRepo.findByPlotIdWithPlantInfo(plotId).map(s => this.deserializeWithPlant(s));
  }

  create(data: unknown) {
    const parsed = SubPlotCreateSchema.parse(data);
    const id = uuid();
    const geometry = parsed.geometry ?? DEFAULT_GEOMETRY;

    const row: Record<string, any> = {
      id,
      plot_id: parsed.plot_id,
      grid_row: parsed.grid_position?.row ?? 0,
      grid_col: parsed.grid_position?.col ?? 0,
      geometry_json: JSON.stringify(geometry),
      plant_instance_id: parsed.plant_instance_id ?? null,
      notes: parsed.notes ?? null,
    };

    const result = this.db.transaction(() => {
      const created = this.subPlotRepo.insert(row);
      this.history.logCreate('sub_plot', created);
      return this.deserialize(created);
    })();

    return result;
  }

  update(id: string, data: unknown) {
    const parsed = SubPlotUpdateSchema.parse(data);

    const result = this.db.transaction(() => {
      const old = this.subPlotRepo.findById(id);
      if (!old) throw new NotFoundError('SubPlot', id);

      const updateData: Record<string, any> = {};
      if (parsed.geometry !== undefined) updateData.geometry_json = JSON.stringify(parsed.geometry);
      if (parsed.plant_instance_id !== undefined) updateData.plant_instance_id = parsed.plant_instance_id;
      if (parsed.notes !== undefined) updateData.notes = parsed.notes;

      const updated = this.subPlotRepo.update(id, updateData);
      if (!updated) throw new NotFoundError('SubPlot', id);

      this.history.logUpdate('sub_plot', id, old, updated);
      return this.deserialize(updated);
    })();

    return result;
  }

  delete(id: string): void {
    this.db.transaction(() => {
      const old = this.subPlotRepo.findById(id);
      if (!old) throw new NotFoundError('SubPlot', id);

      this.subPlotRepo.delete(id);
      this.history.logDelete('sub_plot', old);
    })();
  }

  private deserialize(row: SubPlotRow) {
    return {
      ...row,
      grid_position: { row: row.grid_row, col: row.grid_col },
      geometry: JSON.parse(row.geometry_json),
    };
  }

  private deserializeWithPlant(row: SubPlotWithPlantRow) {
    return {
      ...row,
      grid_position: { row: row.grid_row, col: row.grid_col },
      geometry: JSON.parse(row.geometry_json),
      plant_name: row.plant_name,
    };
  }
}
