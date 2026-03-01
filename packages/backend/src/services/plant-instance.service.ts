import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import { PlantInstanceCreateSchema, PlantInstanceUpdateSchema, PlantInstanceStatusUpdateSchema, PlantInstanceHealthUpdateSchema } from '@gardenvault/shared';
import type { PlantInstanceRepository } from '../db/repositories/plant-instance.repository.js';
import type { SubPlotRepository } from '../db/repositories/sub-plot.repository.js';
import type { PlantCatalogRepository } from '../db/repositories/plant-catalog.repository.js';
import type { PlotRepository } from '../db/repositories/plot.repository.js';
import type { GardenRepository } from '../db/repositories/garden.repository.js';
import type { HistoryLogger } from './history.middleware.js';
import type { CalendarService } from './calendar.service.js';
import type { TaskService } from './task.service.js';
import { NotFoundError } from '../utils/errors.js';

const TERMINAL_STATUSES = ['finished', 'failed', 'removed'];

export class PlantInstanceService {
  private calendarService: CalendarService | null = null;
  private taskService: TaskService | null = null;

  constructor(
    private db: Database.Database,
    private instanceRepo: PlantInstanceRepository,
    private subPlotRepo: SubPlotRepository,
    private history: HistoryLogger,
    private catalogRepo?: PlantCatalogRepository,
    private plotRepo?: PlotRepository,
    private gardenRepo?: GardenRepository,
  ) {}

  /** Set after construction to avoid circular dependency issues */
  setCalendarService(calendarService: CalendarService) {
    this.calendarService = calendarService;
  }

  setTaskService(taskService: TaskService) {
    this.taskService = taskService;
  }

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
    row.tags = JSON.stringify(parsed.tags ?? []);

    const result = this.db.transaction(() => {
      const created = this.instanceRepo.insert(row);
      this.history.logCreate('plant_instance', created);

      // If sub_plot specified, assign plant to it
      if (parsed.sub_plot_id) {
        this.subPlotRepo.assignPlant(parsed.sub_plot_id, id);
      }

      // Auto-generate tasks from calendar engine
      if (this.calendarService && this.taskService && this.catalogRepo && this.plotRepo && this.gardenRepo) {
        const catalog = this.catalogRepo.findById(parsed.plant_catalog_id);
        const plot = this.plotRepo.findById(parsed.plot_id);
        if (catalog && plot) {
          const garden = this.gardenRepo.findById(plot.garden_id);
          if (garden) {
            const autoTasks = this.calendarService.computeAutoTasks(garden, catalog, created);
            for (const taskData of autoTasks) {
              this.taskService.create(taskData);
            }
          }
        }
      }

      return created;
    })();

    return result;
  }

  update(id: string, data: unknown) {
    const parsed = PlantInstanceUpdateSchema.parse(data);
    const updateData: Record<string, any> = { ...parsed };
    if (parsed.tags !== undefined) {
      updateData.tags = JSON.stringify(parsed.tags);
    }

    const result = this.db.transaction(() => {
      const old = this.instanceRepo.findById(id);
      if (!old) throw new NotFoundError('PlantInstance', id);

      const updated = this.instanceRepo.update(id, updateData);
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
      const today = new Date().toISOString().split('T')[0];

      // Set date fields based on status
      if (status === 'germinated') {
        updateData.date_germinated = old.date_germinated ?? today;
      } else if (status === 'transplanted') {
        updateData.date_transplanted = old.date_transplanted ?? today;
      } else if (status === 'harvesting') {
        updateData.date_first_harvest = old.date_first_harvest ?? today;
      } else if (status === 'finished' || status === 'failed' || status === 'removed') {
        updateData.date_finished = today;
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

  /**
   * Create a series of staggered plant instances for succession planting.
   */
  createSuccession(params: {
    plant_catalog_id: string;
    plot_id: string;
    start_date: string;
    interval_days: number;
    count: number;
    planting_method?: string;
    sub_plot_id?: string;
  }) {
    const instances = [];
    for (let i = 0; i < params.count; i++) {
      const d = new Date(params.start_date + 'T12:00:00');
      d.setDate(d.getDate() + (i * params.interval_days));
      const datePlanted = d.toISOString().split('T')[0];

      const instance = this.create({
        plant_catalog_id: params.plant_catalog_id,
        plot_id: params.plot_id,
        sub_plot_id: params.sub_plot_id,
        planting_method: params.planting_method ?? 'direct_seed',
        date_planted: datePlanted,
        status: i === 0 ? 'planned' : 'planned',
        notes: `Succession planting ${i + 1} of ${params.count}`,
      });
      instances.push(instance);
    }
    return instances;
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
