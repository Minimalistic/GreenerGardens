import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import { PlantInstanceCreateSchema, PlantInstanceUpdateSchema, PlantInstanceStatusUpdateSchema, PlantInstanceHealthUpdateSchema } from '@gardenvault/shared';
import type { PlantInstanceRepository } from '../db/repositories/plant-instance.repository.js';
import type { SubPlotRepository } from '../db/repositories/sub-plot.repository.js';
import type { HistoryLogger } from './history.middleware.js';
import { NotFoundError } from '../utils/errors.js';

const TERMINAL_STATUSES = ['finished', 'failed', 'removed'];

export class PlantInstanceService {
  constructor(
    private db: Database.Database,
    private instanceRepo: PlantInstanceRepository,
    private subPlotRepo: SubPlotRepository,
    private history: HistoryLogger,
  ) {}

  findAll(options?: { limit?: number; offset?: number }) {
    return this.instanceRepo.findAll(options);
  }

  findById(id: string) {
    const inst = this.instanceRepo.findWithCatalogInfo(id);
    if (!inst) throw new NotFoundError('PlantInstance', id);
    return inst;
  }

  findByPlotId(plotId: string) {
    return this.instanceRepo.findByPlotId(plotId);
  }

  create(data: unknown) {
    const parsed = PlantInstanceCreateSchema.parse(data);
    const id = uuid();

    const row: Record<string, any> = { id, ...parsed };
    delete row.sub_plot_id; // Handle separately
    row.sub_plot_id = parsed.sub_plot_id ?? null;

    const result = this.db.transaction(() => {
      const created = this.instanceRepo.insert(row);
      this.history.logCreate('plant_instance', created);

      // If sub_plot specified, assign plant to it
      if (parsed.sub_plot_id) {
        this.subPlotRepo.assignPlant(parsed.sub_plot_id, id);
      }

      return created;
    })();

    return result;
  }

  update(id: string, data: unknown) {
    const parsed = PlantInstanceUpdateSchema.parse(data);

    const result = this.db.transaction(() => {
      const old = this.instanceRepo.findById(id);
      if (!old) throw new NotFoundError('PlantInstance', id);

      const updated = this.instanceRepo.update(id, parsed);
      if (!updated) throw new NotFoundError('PlantInstance', id);

      this.history.logUpdate('plant_instance', id, old, updated);
      return updated;
    })();

    return result;
  }

  updateStatus(id: string, data: unknown) {
    const { status } = PlantInstanceStatusUpdateSchema.parse(data);

    const result = this.db.transaction(() => {
      const old = this.instanceRepo.findById(id);
      if (!old) throw new NotFoundError('PlantInstance', id);

      const updateData: Record<string, any> = { status };

      // Set date fields based on status
      if (status === 'finished' || status === 'failed' || status === 'removed') {
        updateData.date_finished = new Date().toISOString().split('T')[0];
      }

      const updated = this.instanceRepo.update(id, updateData);
      if (!updated) throw new NotFoundError('PlantInstance', id);

      // Clear sub-plot assignment on terminal status
      if (TERMINAL_STATUSES.includes(status)) {
        this.subPlotRepo.clearPlantByInstanceId(id);
      }

      this.history.logUpdate('plant_instance', id, old, updated);
      return updated;
    })();

    return result;
  }

  updateHealth(id: string, data: unknown) {
    const { health } = PlantInstanceHealthUpdateSchema.parse(data);

    const result = this.db.transaction(() => {
      const old = this.instanceRepo.findById(id);
      if (!old) throw new NotFoundError('PlantInstance', id);

      const updated = this.instanceRepo.update(id, { health });
      if (!updated) throw new NotFoundError('PlantInstance', id);

      this.history.logUpdate('plant_instance', id, old, updated);
      return updated;
    })();

    return result;
  }

  delete(id: string): void {
    this.db.transaction(() => {
      const old = this.instanceRepo.findById(id);
      if (!old) throw new NotFoundError('PlantInstance', id);

      this.subPlotRepo.clearPlantByInstanceId(id);
      this.instanceRepo.delete(id);
      this.history.logDelete('plant_instance', old);
    })();
  }
}
