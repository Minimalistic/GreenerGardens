import type Database from 'better-sqlite3';
import type { WeatherService } from './weather.service.js';
import type { TaskRepository } from '../db/repositories/task.repository.js';
import type { GardenRepository } from '../db/repositories/garden.repository.js';
import { v4 as uuid } from 'uuid';

export interface WeatherAlert {
  date: string;
  temp: number;
  type: 'frost' | 'freeze' | 'heat';
  task_id: string;
}

export class AlertService {
  constructor(
    private db: Database.Database,
    private weatherService: WeatherService,
    private taskRepo: TaskRepository,
    private gardenRepo: GardenRepository,
  ) {}

  async checkFrostAlert(gardenId: string) {
    if (!this.weatherService.isConfigured()) return [];

    const garden = this.gardenRepo.findById(gardenId);
    if (!garden || !garden.latitude || !garden.longitude) return [];

    try {
      const result = await this.weatherService.fetchForecast(gardenId);
      const forecastItems = result.data;
      if (!forecastItems || forecastItems.length === 0) return [];

      const alerts: WeatherAlert[] = [];
      const frostThreshold = 36; // °F

      // Group forecast by date
      const dateTemps = new Map<string, number>();
      for (const item of forecastItems) {
        const date = item.dt_txt.split(' ')[0];
        const existing = dateTemps.get(date);
        if (existing === undefined || item.temp_min_f < existing) {
          dateTemps.set(date, item.temp_min_f);
        }
      }

      for (const [date, minTemp] of dateTemps) {
        if (minTemp <= frostThreshold) {
          // Check if alert task already exists for this date
          const existing = this.db.prepare(
            `SELECT id FROM tasks WHERE task_type = 'frost_alert' AND due_date = ? AND status IN ('pending', 'in_progress') AND auto_generated = 1`
          ).get(date) as { id: string } | undefined;

          if (!existing) {
            const taskId = uuid();
            const isFreezing = minTemp <= 32;

            this.taskRepo.insert({
              id: taskId,
              entity_type: 'garden',
              entity_id: gardenId,
              task_type: 'frost_alert',
              title: isFreezing
                ? `Freeze Warning: ${Math.round(minTemp)}°F expected on ${date}`
                : `Frost Advisory: ${Math.round(minTemp)}°F expected on ${date}`,
              description: `Low temperature of ${Math.round(minTemp)}°F forecasted. Cover or bring in frost-sensitive plants.`,
              due_date: date,
              priority: isFreezing ? 'urgent' : 'high',
              status: 'pending',
              auto_generated: 1,
              is_recurring: 0,
              recurrence_rule: '{}',
              source_reason: 'weather_forecast',
            });

            alerts.push({ date, temp: minTemp, type: isFreezing ? 'freeze' : 'frost', task_id: taskId });
          }
        }
      }

      return alerts;
    } catch (err) {
      console.error(`[AlertService] Frost check failed for garden ${gardenId}: ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }

  async checkHeatAlert(gardenId: string) {
    if (!this.weatherService.isConfigured()) return [];

    const garden = this.gardenRepo.findById(gardenId);
    if (!garden || !garden.latitude || !garden.longitude) return [];

    try {
      const result = await this.weatherService.fetchForecast(gardenId);
      const forecastItems = result.data;
      if (!forecastItems || forecastItems.length === 0) return [];

      const alerts: WeatherAlert[] = [];
      const heatThreshold = 95;

      const dateTemps = new Map<string, number>();
      for (const item of forecastItems) {
        const date = item.dt_txt.split(' ')[0];
        const existing = dateTemps.get(date);
        if (existing === undefined || item.temp_max_f > (existing ?? 0)) {
          dateTemps.set(date, item.temp_max_f);
        }
      }

      for (const [date, maxTemp] of dateTemps) {
        if (maxTemp >= heatThreshold) {
          const existing = this.db.prepare(
            `SELECT id FROM tasks WHERE task_type = 'heat_alert' AND due_date = ? AND status IN ('pending', 'in_progress') AND auto_generated = 1`
          ).get(date) as { id: string } | undefined;

          if (!existing) {
            const taskId = uuid();
            this.taskRepo.insert({
              id: taskId,
              entity_type: 'garden',
              entity_id: gardenId,
              task_type: 'heat_alert',
              title: `Heat Warning: ${Math.round(maxTemp)}°F expected on ${date}`,
              description: `High temperature of ${Math.round(maxTemp)}°F forecasted. Provide shade and extra water for heat-sensitive plants.`,
              due_date: date,
              priority: 'high',
              status: 'pending',
              auto_generated: 1,
              is_recurring: 0,
              recurrence_rule: '{}',
              source_reason: 'weather_forecast',
            });

            alerts.push({ date, temp: maxTemp, type: 'heat', task_id: taskId });
          }
        }
      }

      return alerts;
    } catch (err) {
      console.error(`[AlertService] Heat check failed for garden ${gardenId}: ${err instanceof Error ? err.message : err}`);
      return [];
    }
  }

  getActiveAlerts(gardenId: string) {
    return this.db.prepare(
      `SELECT * FROM tasks
       WHERE entity_type = 'garden' AND entity_id = ?
       AND task_type IN ('frost_alert', 'heat_alert', 'watering_reminder')
       AND status IN ('pending', 'in_progress')
       AND auto_generated = 1
       ORDER BY due_date ASC`
    ).all(gardenId) as Record<string, unknown>[];
  }
}
