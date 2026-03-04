import type Database from 'better-sqlite3';
import type { WeatherService } from './weather.service.js';
import type { TaskRepository } from '../db/repositories/task.repository.js';
import type { GardenRepository } from '../db/repositories/garden.repository.js';
import { v4 as uuid } from 'uuid';

interface AlertConfig {
  taskType: string;
  threshold: number;
  compare: 'below' | 'above';
  tempField: 'temp_min_f' | 'temp_max_f';
  aggregator: (current: number, candidate: number) => boolean;
  makeTitle: (temp: number, date: string) => string;
  makeDescription: (temp: number) => string;
  getPriority: (temp: number) => string;
  getAlertType: (temp: number) => string;
  logLabel: string;
}

const FROST_CONFIG: AlertConfig = {
  taskType: 'frost_alert',
  threshold: 36,
  compare: 'below',
  tempField: 'temp_min_f',
  aggregator: (current, candidate) => candidate < current,
  makeTitle: (temp, date) =>
    temp <= 32
      ? `Freeze Warning: ${Math.round(temp)}°F expected on ${date}`
      : `Frost Advisory: ${Math.round(temp)}°F expected on ${date}`,
  makeDescription: (temp) =>
    `Low temperature of ${Math.round(temp)}°F forecasted. Cover or bring in frost-sensitive plants.`,
  getPriority: (temp) => (temp <= 32 ? 'urgent' : 'high'),
  getAlertType: (temp) => (temp <= 32 ? 'freeze' : 'frost'),
  logLabel: 'Frost',
};

const HEAT_CONFIG: AlertConfig = {
  taskType: 'heat_alert',
  threshold: 95,
  compare: 'above',
  tempField: 'temp_max_f',
  aggregator: (current, candidate) => candidate > current,
  makeTitle: (temp, date) =>
    `Heat Warning: ${Math.round(temp)}°F expected on ${date}`,
  makeDescription: (temp) =>
    `High temperature of ${Math.round(temp)}°F forecasted. Provide shade and extra water for heat-sensitive plants.`,
  getPriority: () => 'high',
  getAlertType: () => 'heat',
  logLabel: 'Heat',
};

export class AlertService {
  constructor(
    private db: Database.Database,
    private weatherService: WeatherService,
    private taskRepo: TaskRepository,
    private gardenRepo: GardenRepository,
  ) {}

  async checkFrostAlert(gardenId: string) {
    return this.checkWeatherAlert(gardenId, FROST_CONFIG);
  }

  async checkHeatAlert(gardenId: string) {
    return this.checkWeatherAlert(gardenId, HEAT_CONFIG);
  }

  private async checkWeatherAlert(gardenId: string, config: AlertConfig) {
    if (!this.weatherService.isConfigured()) return [];

    const garden = this.gardenRepo.findById(gardenId);
    if (!garden || !garden.latitude || !garden.longitude) return [];

    try {
      const result = await this.weatherService.fetchForecast(gardenId);
      const forecastItems = result.data;
      if (!forecastItems || forecastItems.length === 0) return [];

      const alerts: any[] = [];
      const dateTemps = new Map<string, number>();

      for (const item of forecastItems) {
        const date = item.dt_txt.split(' ')[0];
        const temp = item[config.tempField];
        const existing = dateTemps.get(date);
        if (existing === undefined || config.aggregator(existing, temp)) {
          dateTemps.set(date, temp);
        }
      }

      for (const [date, temp] of dateTemps) {
        const triggered = config.compare === 'below'
          ? temp <= config.threshold
          : temp >= config.threshold;

        if (triggered) {
          const existing = this.db.prepare(
            `SELECT id FROM tasks WHERE task_type = ? AND due_date = ? AND status IN ('pending', 'in_progress') AND auto_generated = 1`
          ).get(config.taskType, date) as any;

          if (!existing) {
            const taskId = uuid();
            this.taskRepo.insert({
              id: taskId,
              entity_type: 'garden',
              entity_id: gardenId,
              task_type: config.taskType,
              title: config.makeTitle(temp, date),
              description: config.makeDescription(temp),
              due_date: date,
              priority: config.getPriority(temp),
              status: 'pending',
              auto_generated: 1,
              is_recurring: 0,
              recurrence_rule: '{}',
              source_reason: 'weather_forecast',
            });

            alerts.push({ date, temp, type: config.getAlertType(temp), task_id: taskId });
          }
        }
      }

      return alerts;
    } catch (err: any) {
      console.error(`[AlertService] ${config.logLabel} check failed for garden ${gardenId}: ${err.message}`);
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
    ).all(gardenId) as any[];
  }
}
