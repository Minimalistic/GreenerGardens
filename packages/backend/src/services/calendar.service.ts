import type Database from 'better-sqlite3';
import type { GardenRepository, GardenRow } from '../db/repositories/garden.repository.js';
import type { PlantCatalogRepository, PlantCatalogRow } from '../db/repositories/plant-catalog.repository.js';
import type { PlantInstanceRepository, PlantInstanceRow } from '../db/repositories/plant-instance.repository.js';
import type { TaskRepository, TaskRow } from '../db/repositories/task.repository.js';

export interface CalendarEvent {
  id: string;
  date: string;
  type: 'indoor_start' | 'direct_sow' | 'transplant' | 'harvest' | 'task' | 'frost' | 'planted' | 'germinated' | 'transplanted' | 'harvested' | 'finished';
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  plant_name: string | null;
  priority: string | null;
}

export interface PlantingSuggestion {
  plant_catalog_id: string;
  common_name: string;
  plant_type: string;
  action: 'indoor_start' | 'direct_sow' | 'transplant';
  suggested_date: string;
  reason: string;
}

function addDays(dateStr: string, days: number): string {
  // Handle MM-DD format (frost dates) by prepending current year
  const normalized = dateStr.match(/^\d{2}-\d{2}$/)
    ? `${new Date().getFullYear()}-${dateStr}`
    : dateStr;
  const d = new Date(normalized + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

/** Normalize MM-DD frost dates to YYYY-MM-DD using the given year (defaults to current). */
function normalizeFrostDate(dateStr: string, year?: number): string {
  if (dateStr.match(/^\d{2}-\d{2}$/)) {
    return `${year ?? new Date().getFullYear()}-${dateStr}`;
  }
  return dateStr;
}

function isInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export class CalendarService {
  constructor(
    private db: Database.Database,
    private gardenRepo: GardenRepository,
    private catalogRepo: PlantCatalogRepository,
    private instanceRepo: PlantInstanceRepository,
    private taskRepo: TaskRepository,
  ) {}

  getMonthEvents(gardenId: string, year: number, month: number): CalendarEvent[] {
    const garden = this.gardenRepo.findById(gardenId);
    if (!garden) return [];

    // Month is 1-indexed
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const events: CalendarEvent[] = [];

    // Frost date markers
    this.addFrostEvents(garden, startDate, endDate, events);

    // Plant instance events (computed from catalog data + frost dates)
    this.addPlantEvents(garden, startDate, endDate, events);

    // Task events
    this.addTaskEvents(startDate, endDate, events);

    // Actual lifecycle events
    this.addActualPlantEvents(gardenId, startDate, endDate, events);
    this.addHarvestEvents(gardenId, startDate, endDate, events);

    events.sort((a, b) => a.date.localeCompare(b.date));
    return events;
  }

  getWeekEvents(gardenId: string): CalendarEvent[] {
    const garden = this.gardenRepo.findById(gardenId);
    if (!garden) return [];

    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const startDate = today.toISOString().split('T')[0];
    const endDate = weekEnd.toISOString().split('T')[0];

    const events: CalendarEvent[] = [];
    this.addFrostEvents(garden, startDate, endDate, events);
    this.addPlantEvents(garden, startDate, endDate, events);
    this.addTaskEvents(startDate, endDate, events);
    this.addActualPlantEvents(gardenId, startDate, endDate, events);
    this.addHarvestEvents(gardenId, startDate, endDate, events);

    events.sort((a, b) => a.date.localeCompare(b.date));
    return events;
  }

  getPlantingSuggestions(gardenId: string): PlantingSuggestion[] {
    const garden = this.gardenRepo.findById(gardenId);
    if (!garden || !garden.last_frost_date) return [];

    const today = new Date().toISOString().split('T')[0];
    const twoWeeksOut = addDays(today, 14);

    const { data: allPlants } = this.catalogRepo.search({ limit: 500 });
    const suggestions: PlantingSuggestion[] = [];

    for (const plant of allPlants) {
      // Indoor start suggestion
      if (plant.indoor_start_weeks_before_frost) {
        const indoorDate = addDays(garden.last_frost_date, -(plant.indoor_start_weeks_before_frost * 7));
        if (isInRange(indoorDate, today, twoWeeksOut)) {
          suggestions.push({
            plant_catalog_id: plant.id,
            common_name: plant.common_name,
            plant_type: plant.plant_type,
            action: 'indoor_start',
            suggested_date: indoorDate,
            reason: `Start ${plant.common_name} seeds indoors ${plant.indoor_start_weeks_before_frost} weeks before last frost`,
          });
        }
      }

      // Direct sow suggestion
      if (plant.outdoor_sow_weeks_after_frost != null) {
        const sowDate = addDays(garden.last_frost_date, plant.outdoor_sow_weeks_after_frost * 7);
        if (isInRange(sowDate, today, twoWeeksOut)) {
          suggestions.push({
            plant_catalog_id: plant.id,
            common_name: plant.common_name,
            plant_type: plant.plant_type,
            action: 'direct_sow',
            suggested_date: sowDate,
            reason: `Direct sow ${plant.common_name} ${plant.outdoor_sow_weeks_after_frost} weeks after last frost`,
          });
        }
      }

      // Transplant suggestion
      if (plant.transplant_weeks_after_last_frost != null) {
        const transplantDate = addDays(garden.last_frost_date, plant.transplant_weeks_after_last_frost * 7);
        if (isInRange(transplantDate, today, twoWeeksOut)) {
          suggestions.push({
            plant_catalog_id: plant.id,
            common_name: plant.common_name,
            plant_type: plant.plant_type,
            action: 'transplant',
            suggested_date: transplantDate,
            reason: `Transplant ${plant.common_name} ${plant.transplant_weeks_after_last_frost} weeks after last frost`,
          });
        }
      }
    }

    suggestions.sort((a, b) => a.suggested_date.localeCompare(b.suggested_date));
    return suggestions;
  }

  /**
   * Compute auto-generated tasks for a newly created plant instance.
   * Returns task creation data (not yet inserted).
   */
  computeAutoTasks(
    garden: GardenRow,
    catalog: PlantCatalogRow,
    instance: PlantInstanceRow,
  ): Array<{
    title: string;
    description: string;
    task_type: string;
    due_date: string;
    priority: string;
    entity_type: string;
    entity_id: string;
    auto_generated: boolean;
    source_reason: string;
  }> {
    const tasks: Array<{
      title: string;
      description: string;
      task_type: string;
      due_date: string;
      priority: string;
      entity_type: string;
      entity_id: string;
      auto_generated: boolean;
      source_reason: string;
    }> = [];

    const lastFrost = garden.last_frost_date;
    if (!lastFrost) return tasks;

    const plantName = catalog.common_name;

    // If started indoors (transplant method or seed_started status)
    if (instance.planting_method === 'transplant' || instance.status === 'seed_started') {
      // Hardening off task (1 week before transplant date)
      if (catalog.transplant_weeks_after_last_frost != null) {
        const transplantDate = addDays(lastFrost, catalog.transplant_weeks_after_last_frost * 7);
        const hardenDate = addDays(transplantDate, -7);

        tasks.push({
          title: `Begin hardening off ${plantName}`,
          description: `Move seedlings outdoors for increasing periods before transplanting on ${transplantDate}`,
          task_type: 'hardening_off',
          due_date: hardenDate,
          priority: 'medium',
          entity_type: 'plant_instance',
          entity_id: instance.id,
          auto_generated: true,
          source_reason: `Auto-generated: ${catalog.transplant_weeks_after_last_frost} weeks after last frost minus 1 week`,
        });

        tasks.push({
          title: `Transplant ${plantName} seedlings`,
          description: `Transplant to garden bed. Last frost date: ${lastFrost}`,
          task_type: 'transplanting',
          due_date: transplantDate,
          priority: 'high',
          entity_type: 'plant_instance',
          entity_id: instance.id,
          auto_generated: true,
          source_reason: `Auto-generated: ${catalog.transplant_weeks_after_last_frost} weeks after last frost`,
        });
      }
    }

    // Expected harvest task
    const baseDate = instance.date_planted ?? new Date().toISOString().split('T')[0];
    if (catalog.days_to_maturity_min) {
      const harvestDate = addDays(baseDate, catalog.days_to_maturity_min);
      tasks.push({
        title: `Expected harvest for ${plantName}`,
        description: `${plantName} should be ready to harvest (${catalog.days_to_maturity_min} days from planting)`,
        task_type: 'harvesting',
        due_date: harvestDate,
        priority: 'low',
        entity_type: 'plant_instance',
        entity_id: instance.id,
        auto_generated: true,
        source_reason: `Auto-generated: ${catalog.days_to_maturity_min} days to maturity from planted date`,
      });
    }

    return tasks;
  }

  private addFrostEvents(garden: GardenRow, startDate: string, endDate: string, events: CalendarEvent[]) {
    const year = parseInt(startDate.slice(0, 4), 10);
    if (garden.last_frost_date) {
      const lastFrost = normalizeFrostDate(garden.last_frost_date, year);
      if (isInRange(lastFrost, startDate, endDate)) {
        events.push({
          id: `frost-last-${lastFrost}`,
          date: lastFrost,
          type: 'frost',
          title: 'Last frost date',
          description: 'Average last frost date for your area',
          entity_type: 'garden',
          entity_id: garden.id,
          plant_name: null,
          priority: 'high',
        });
      }
    }
    if (garden.first_frost_date) {
      const firstFrost = normalizeFrostDate(garden.first_frost_date, year);
      if (isInRange(firstFrost, startDate, endDate)) {
        events.push({
          id: `frost-first-${firstFrost}`,
          date: firstFrost,
          type: 'frost',
          title: 'First frost date',
          description: 'Average first frost date for your area',
          entity_type: 'garden',
          entity_id: garden.id,
          plant_name: null,
          priority: 'high',
        });
      }
    }
  }

  private addPlantEvents(garden: GardenRow, startDate: string, endDate: string, events: CalendarEvent[]) {
    if (!garden.last_frost_date) return;

    // Get all non-terminal plant instances with their catalog info
    const instances = this.db.prepare(`
      SELECT pi.*, pc.common_name, pc.indoor_start_weeks_before_frost,
             pc.outdoor_sow_weeks_after_frost, pc.transplant_weeks_after_last_frost,
             pc.days_to_maturity_min
      FROM plant_instances pi
      JOIN plant_catalog pc ON pi.plant_catalog_id = pc.id
      JOIN plots p ON pi.plot_id = p.id
      WHERE p.garden_id = ?
        AND pi.status NOT IN ('finished', 'failed', 'removed')
    `).all(garden.id) as Array<PlantInstanceRow & {
      common_name: string;
      indoor_start_weeks_before_frost: number | null;
      outdoor_sow_weeks_after_frost: number | null;
      transplant_weeks_after_last_frost: number | null;
      days_to_maturity_min: number | null;
    }>;

    for (const inst of instances) {
      const name = inst.common_name;

      // Indoor start event
      if (inst.indoor_start_weeks_before_frost && inst.status === 'planned') {
        const date = addDays(garden.last_frost_date, -(inst.indoor_start_weeks_before_frost * 7));
        if (isInRange(date, startDate, endDate)) {
          events.push({
            id: `indoor-${inst.id}`,
            date,
            type: 'indoor_start',
            title: `Start ${name} seeds indoors`,
            description: `${inst.indoor_start_weeks_before_frost} weeks before last frost`,
            entity_type: 'plant_instance',
            entity_id: inst.id,
            plant_name: name,
            priority: 'medium',
          });
        }
      }

      // Direct sow event
      if (inst.outdoor_sow_weeks_after_frost != null && inst.status === 'planned') {
        const date = addDays(garden.last_frost_date, inst.outdoor_sow_weeks_after_frost * 7);
        if (isInRange(date, startDate, endDate)) {
          events.push({
            id: `sow-${inst.id}`,
            date,
            type: 'direct_sow',
            title: `Direct sow ${name}`,
            description: `${inst.outdoor_sow_weeks_after_frost} weeks after last frost`,
            entity_type: 'plant_instance',
            entity_id: inst.id,
            plant_name: name,
            priority: 'medium',
          });
        }
      }

      // Transplant event
      if (inst.transplant_weeks_after_last_frost != null) {
        const date = addDays(garden.last_frost_date, inst.transplant_weeks_after_last_frost * 7);
        if (isInRange(date, startDate, endDate)) {
          events.push({
            id: `transplant-${inst.id}`,
            date,
            type: 'transplant',
            title: `Transplant ${name}`,
            description: `${inst.transplant_weeks_after_last_frost} weeks after last frost`,
            entity_type: 'plant_instance',
            entity_id: inst.id,
            plant_name: name,
            priority: 'high',
          });
        }
      }

      // Harvest event
      const baseDate = inst.date_planted ?? inst.created_at?.split('T')[0];
      if (inst.days_to_maturity_min && baseDate) {
        const date = addDays(baseDate, inst.days_to_maturity_min);
        if (isInRange(date, startDate, endDate)) {
          events.push({
            id: `harvest-${inst.id}`,
            date,
            type: 'harvest',
            title: `Harvest ${name}`,
            description: `${inst.days_to_maturity_min} days from planting`,
            entity_type: 'plant_instance',
            entity_id: inst.id,
            plant_name: name,
            priority: 'medium',
          });
        }
      }
    }
  }

  private addTaskEvents(startDate: string, endDate: string, events: CalendarEvent[]) {
    const tasks = this.db.prepare(`
      SELECT * FROM tasks
      WHERE due_date BETWEEN ? AND ?
        AND status NOT IN ('completed', 'skipped', 'cancelled')
      ORDER BY due_date ASC
    `).all(startDate, endDate) as TaskRow[];

    for (const task of tasks) {
      if (!task.due_date) continue;
      events.push({
        id: `task-${task.id}`,
        date: task.due_date,
        type: 'task',
        title: task.title,
        description: task.description,
        entity_type: task.entity_type,
        entity_id: task.entity_id,
        plant_name: null,
        priority: task.priority,
      });
    }
  }

  private addActualPlantEvents(gardenId: string, startDate: string, endDate: string, events: CalendarEvent[]) {
    const instances = this.db.prepare(`
      SELECT pi.id, pi.date_planted, pi.date_germinated, pi.date_transplanted, pi.date_finished,
             pc.common_name
      FROM plant_instances pi
      JOIN plant_catalog pc ON pi.plant_catalog_id = pc.id
      JOIN plots p ON pi.plot_id = p.id
      WHERE p.garden_id = ?
        AND (
          pi.date_planted BETWEEN ? AND ?
          OR pi.date_germinated BETWEEN ? AND ?
          OR pi.date_transplanted BETWEEN ? AND ?
          OR pi.date_finished BETWEEN ? AND ?
        )
    `).all(gardenId, startDate, endDate, startDate, endDate, startDate, endDate, startDate, endDate) as Array<{
      id: string;
      date_planted: string | null;
      date_germinated: string | null;
      date_transplanted: string | null;
      date_finished: string | null;
      common_name: string;
    }>;

    const dateFields = [
      { field: 'date_planted', type: 'planted', verb: 'Planted' },
      { field: 'date_germinated', type: 'germinated', verb: 'Germinated' },
      { field: 'date_transplanted', type: 'transplanted', verb: 'Transplanted' },
      { field: 'date_finished', type: 'finished', verb: 'Finished' },
    ] as const;

    for (const inst of instances) {
      for (const { field, type, verb } of dateFields) {
        const date = inst[field];
        if (date && isInRange(date, startDate, endDate)) {
          events.push({
            id: `${type}-${inst.id}`,
            date,
            type,
            title: `${verb} ${inst.common_name}`,
            description: null,
            entity_type: 'plant_instance',
            entity_id: inst.id,
            plant_name: inst.common_name,
            priority: null,
          });
        }
      }
    }
  }

  private addHarvestEvents(gardenId: string, startDate: string, endDate: string, events: CalendarEvent[]) {
    const harvests = this.db.prepare(`
      SELECT h.id, h.date_harvested, h.quantity, h.unit, h.plant_instance_id,
             pc.common_name
      FROM harvests h
      JOIN plant_instances pi ON h.plant_instance_id = pi.id
      JOIN plant_catalog pc ON pi.plant_catalog_id = pc.id
      JOIN plots p ON h.plot_id = p.id
      WHERE p.garden_id = ?
        AND h.date_harvested BETWEEN ? AND ?
    `).all(gardenId, startDate, endDate) as Array<{
      id: string;
      date_harvested: string;
      quantity: number;
      unit: string;
      plant_instance_id: string;
      common_name: string;
    }>;

    for (const h of harvests) {
      events.push({
        id: `harvested-${h.id}`,
        date: h.date_harvested,
        type: 'harvested',
        title: `Harvested ${h.common_name}`,
        description: `${h.quantity} ${h.unit}`,
        entity_type: 'plant_instance',
        entity_id: h.plant_instance_id,
        plant_name: h.common_name,
        priority: null,
      });
    }
  }
}
