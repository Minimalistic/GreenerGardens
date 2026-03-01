import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import type { HistoryLogger } from '../../services/history.middleware.js';

import { GardenRepository } from '../../db/repositories/garden.repository.js';
import { PlantCatalogRepository } from '../../db/repositories/plant-catalog.repository.js';
import { PlantInstanceRepository } from '../../db/repositories/plant-instance.repository.js';
import { HistoryLogRepository } from '../../db/repositories/history-log.repository.js';
import { WeatherReadingRepository, WeatherDailySummaryRepository } from '../../db/repositories/weather.repository.js';
import { TaskRepository } from '../../db/repositories/task.repository.js';

import { HistoryLogService } from '../../services/history-log.service.js';
import { WeatherService } from '../../services/weather.service.js';
import { TaskService } from '../../services/task.service.js';
import { CalendarService } from '../../services/calendar.service.js';
import { AlertService } from '../../services/alert.service.js';

import { historyRoutes } from '../history.routes.js';
import { weatherRoutes } from '../weather.routes.js';
import { weatherCompareRoutes } from '../weather-compare.routes.js';
import { taskRoutes } from '../task.routes.js';
import { calendarRoutes } from '../calendar.routes.js';
import { alertRoutes } from '../alert.routes.js';

export function registerTrackingRoutes(fastify: FastifyInstance, db: Database.Database, history: HistoryLogger) {
  const gardenRepo = new GardenRepository(db);
  const catalogRepo = new PlantCatalogRepository(db);
  const instanceRepo = new PlantInstanceRepository(db);
  const historyRepo = new HistoryLogRepository(db);
  const weatherReadingRepo = new WeatherReadingRepository(db);
  const weatherSummaryRepo = new WeatherDailySummaryRepository(db);
  const taskRepo = new TaskRepository(db);

  const historyService = new HistoryLogService(historyRepo);
  const weatherService = new WeatherService(db, weatherReadingRepo, weatherSummaryRepo, gardenRepo);
  const taskService = new TaskService(db, taskRepo, history);
  const calendarService = new CalendarService(db, gardenRepo, catalogRepo, instanceRepo, taskRepo);
  const alertService = new AlertService(db, weatherService, taskRepo, gardenRepo);

  historyRoutes(fastify, historyService);
  weatherRoutes(fastify, weatherService);
  weatherCompareRoutes(fastify, db);
  taskRoutes(fastify, taskService);
  calendarRoutes(fastify, calendarService);
  alertRoutes(fastify, alertService);

  return { weatherService, taskService, calendarService, alertService, gardenRepo };
}
