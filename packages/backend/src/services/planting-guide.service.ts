import type Database from 'better-sqlite3';
import type { GardenRepository } from '../db/repositories/garden.repository.js';
import type { PlantCatalogRepository } from '../db/repositories/plant-catalog.repository.js';
import { NotFoundError } from '../utils/errors.js';

interface PlantingGuideEntry {
  plant_id: string;
  common_name: string;
  plant_type: string;
  action: string;
  days_remaining: number;
  window_start: string;
  window_end: string;
}

interface PlantingGuide {
  date: string;
  garden_id: string;
  last_frost_date: string | null;
  first_frost_date: string | null;
  start_indoors: PlantingGuideEntry[];
  direct_sow: PlantingGuideEntry[];
  transplant: PlantingGuideEntry[];
  coming_up: PlantingGuideEntry[];
}

export class PlantingGuideService {
  constructor(
    private db: Database.Database,
    private gardenRepo: GardenRepository,
    private catalogRepo: PlantCatalogRepository,
  ) {}

  getPlantingGuide(gardenId: string, dateStr?: string): PlantingGuide {
    const garden = this.gardenRepo.findById(gardenId);
    if (!garden) throw new NotFoundError('Garden', gardenId);

    const date = dateStr ? new Date(dateStr) : new Date();
    const currentYear = date.getFullYear();

    // Parse frost dates (stored as MM-DD)
    const lastFrostDate = garden.last_frost_date
      ? new Date(`${currentYear}-${garden.last_frost_date}`)
      : null;
    const firstFrostDate = garden.first_frost_date
      ? new Date(`${currentYear}-${garden.first_frost_date}`)
      : null;

    if (!lastFrostDate) {
      return {
        date: date.toISOString().split('T')[0],
        garden_id: gardenId,
        last_frost_date: garden.last_frost_date,
        first_frost_date: garden.first_frost_date,
        start_indoors: [],
        direct_sow: [],
        transplant: [],
        coming_up: [],
      };
    }

    // Get all plants appropriate for this zone
    const zone = garden.usda_zone ? parseInt(garden.usda_zone) : null;
    const allPlants = this.catalogRepo.findAll({ limit: 500 }) as any[];

    const startIndoors: PlantingGuideEntry[] = [];
    const directSow: PlantingGuideEntry[] = [];
    const transplant: PlantingGuideEntry[] = [];
    const comingUp: PlantingGuideEntry[] = [];

    for (const plant of allPlants) {
      // Filter by zone if available
      if (zone && plant.min_zone && plant.max_zone) {
        if (zone < plant.min_zone || zone > plant.max_zone) continue;
      }

      // Indoor start window
      if (plant.indoor_start_weeks_before_frost) {
        const weeksBeforeFrost = plant.indoor_start_weeks_before_frost;
        const windowStart = new Date(lastFrostDate);
        windowStart.setDate(windowStart.getDate() - (weeksBeforeFrost * 7));
        const windowEnd = new Date(windowStart);
        windowEnd.setDate(windowEnd.getDate() + 14); // 2-week window

        const entry = this.makeEntry(plant, 'Start indoors', date, windowStart, windowEnd);
        if (entry) {
          if (date >= windowStart && date <= windowEnd) {
            startIndoors.push(entry);
          } else if (date < windowStart && this.daysBetween(date, windowStart) <= 28) {
            comingUp.push({ ...entry, action: 'Start indoors (upcoming)' });
          }
        }
      }

      // Direct sow window
      if (plant.outdoor_sow_weeks_after_frost !== null && plant.outdoor_sow_weeks_after_frost !== undefined) {
        const weeksAfterFrost = plant.outdoor_sow_weeks_after_frost;
        const windowStart = new Date(lastFrostDate);
        windowStart.setDate(windowStart.getDate() + (weeksAfterFrost * 7));
        const windowEnd = new Date(windowStart);
        windowEnd.setDate(windowEnd.getDate() + 21); // 3-week window

        // Don't sow past first frost
        if (firstFrostDate && windowEnd > firstFrostDate) {
          windowEnd.setTime(firstFrostDate.getTime());
        }

        const entry = this.makeEntry(plant, 'Direct sow', date, windowStart, windowEnd);
        if (entry) {
          if (date >= windowStart && date <= windowEnd) {
            directSow.push(entry);
          } else if (date < windowStart && this.daysBetween(date, windowStart) <= 28) {
            comingUp.push({ ...entry, action: 'Direct sow (upcoming)' });
          }
        }
      }

      // Transplant window
      if (plant.transplant_weeks_after_last_frost) {
        const weeksAfterFrost = plant.transplant_weeks_after_last_frost;
        const windowStart = new Date(lastFrostDate);
        windowStart.setDate(windowStart.getDate() + (weeksAfterFrost * 7));
        const windowEnd = new Date(windowStart);
        windowEnd.setDate(windowEnd.getDate() + 14); // 2-week window

        const entry = this.makeEntry(plant, 'Transplant', date, windowStart, windowEnd);
        if (entry) {
          if (date >= windowStart && date <= windowEnd) {
            transplant.push(entry);
          } else if (date < windowStart && this.daysBetween(date, windowStart) <= 28) {
            comingUp.push({ ...entry, action: 'Transplant (upcoming)' });
          }
        }
      }
    }

    return {
      date: date.toISOString().split('T')[0],
      garden_id: gardenId,
      last_frost_date: garden.last_frost_date,
      first_frost_date: garden.first_frost_date,
      start_indoors: startIndoors.sort((a, b) => a.days_remaining - b.days_remaining),
      direct_sow: directSow.sort((a, b) => a.days_remaining - b.days_remaining),
      transplant: transplant.sort((a, b) => a.days_remaining - b.days_remaining),
      coming_up: comingUp.sort((a, b) => a.days_remaining - b.days_remaining),
    };
  }

  private makeEntry(
    plant: any,
    action: string,
    currentDate: Date,
    windowStart: Date,
    windowEnd: Date,
  ): PlantingGuideEntry | null {
    if (windowEnd < windowStart) return null;

    const daysRemaining = Math.max(0, this.daysBetween(currentDate, windowEnd));

    return {
      plant_id: plant.id,
      common_name: plant.common_name,
      plant_type: plant.plant_type ?? 'other',
      action,
      days_remaining: daysRemaining,
      window_start: windowStart.toISOString().split('T')[0],
      window_end: windowEnd.toISOString().split('T')[0],
    };
  }

  private daysBetween(a: Date, b: Date): number {
    const msPerDay = 86400000;
    return Math.round((b.getTime() - a.getTime()) / msPerDay);
  }
}
