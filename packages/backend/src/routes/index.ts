import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';

import { GardenRepository } from '../db/repositories/garden.repository.js';
import { PlotRepository } from '../db/repositories/plot.repository.js';
import { SubPlotRepository } from '../db/repositories/sub-plot.repository.js';
import { PlantCatalogRepository } from '../db/repositories/plant-catalog.repository.js';
import { PlantInstanceRepository } from '../db/repositories/plant-instance.repository.js';
import { HarvestRepository } from '../db/repositories/harvest.repository.js';
import { HistoryLogRepository } from '../db/repositories/history-log.repository.js';
import { WeatherReadingRepository, WeatherDailySummaryRepository } from '../db/repositories/weather.repository.js';
import { TaskRepository } from '../db/repositories/task.repository.js';
import { LlmConversationRepository, LlmMessageRepository } from '../db/repositories/llm.repository.js';

import { createHistoryLogger } from '../services/history.middleware.js';

import { GardenService } from '../services/garden.service.js';
import { PlotService } from '../services/plot.service.js';
import { SubPlotService } from '../services/sub-plot.service.js';
import { PlantCatalogService } from '../services/plant-catalog.service.js';
import { PlantInstanceService } from '../services/plant-instance.service.js';
import { HarvestService } from '../services/harvest.service.js';
import { HistoryLogService } from '../services/history-log.service.js';
import { WeatherService } from '../services/weather.service.js';
import { TaskService } from '../services/task.service.js';
import { CalendarService } from '../services/calendar.service.js';
import { LlmContextService } from '../services/llm-context.service.js';
import { LlmService } from '../services/llm.service.js';

import { setupRoutes } from './setup.routes.js';
import { gardenRoutes } from './garden.routes.js';
import { plotRoutes } from './plot.routes.js';
import { subPlotRoutes } from './sub-plot.routes.js';
import { plantCatalogRoutes } from './plant-catalog.routes.js';
import { plantInstanceRoutes } from './plant-instance.routes.js';
import { harvestRoutes } from './harvest.routes.js';
import { historyRoutes } from './history.routes.js';
import { settingsRoutes } from './settings.routes.js';
import { weatherRoutes } from './weather.routes.js';
import { taskRoutes } from './task.routes.js';
import { calendarRoutes } from './calendar.routes.js';
import { exportRoutes } from './export.routes.js';
import { assistantRoutes } from './assistant.routes.js';

import { startWeatherFetchJob } from '../jobs/weather-fetch.job.js';

export function registerRoutes(fastify: FastifyInstance, db: Database.Database) {
  // Repositories
  const gardenRepo = new GardenRepository(db);
  const plotRepo = new PlotRepository(db);
  const subPlotRepo = new SubPlotRepository(db);
  const catalogRepo = new PlantCatalogRepository(db);
  const instanceRepo = new PlantInstanceRepository(db);
  const harvestRepo = new HarvestRepository(db);
  const historyRepo = new HistoryLogRepository(db);
  const weatherReadingRepo = new WeatherReadingRepository(db);
  const weatherSummaryRepo = new WeatherDailySummaryRepository(db);
  const taskRepo = new TaskRepository(db);
  const llmConvRepo = new LlmConversationRepository(db);
  const llmMsgRepo = new LlmMessageRepository(db);

  // History logger
  const history = createHistoryLogger(historyRepo);

  // Services
  const gardenService = new GardenService(db, gardenRepo, history);
  const plotService = new PlotService(db, plotRepo, subPlotRepo, gardenRepo, history);
  const subPlotService = new SubPlotService(db, subPlotRepo, history);
  const catalogService = new PlantCatalogService(catalogRepo);
  const instanceService = new PlantInstanceService(db, instanceRepo, subPlotRepo, history, catalogRepo, plotRepo, gardenRepo);
  const harvestService = new HarvestService(db, harvestRepo, history);
  const historyService = new HistoryLogService(historyRepo);
  const weatherService = new WeatherService(db, weatherReadingRepo, weatherSummaryRepo, gardenRepo);
  const taskService = new TaskService(db, taskRepo, history);
  const calendarService = new CalendarService(db, gardenRepo, catalogRepo, instanceRepo, taskRepo);
  const llmContextService = new LlmContextService(db, gardenRepo);
  const llmService = new LlmService(llmConvRepo, llmMsgRepo, llmContextService);

  // Wire up cross-service dependencies (post-construction to avoid circular issues)
  instanceService.setCalendarService(calendarService);
  instanceService.setTaskService(taskService);

  // Register route groups
  setupRoutes(fastify, gardenService);
  gardenRoutes(fastify, gardenService, plotService);
  plotRoutes(fastify, plotService, subPlotService);
  subPlotRoutes(fastify, subPlotService);
  plantCatalogRoutes(fastify, catalogService);
  plantInstanceRoutes(fastify, instanceService);
  harvestRoutes(fastify, harvestService);
  historyRoutes(fastify, historyService);
  settingsRoutes(fastify, gardenService);
  weatherRoutes(fastify, weatherService);
  taskRoutes(fastify, taskService);
  calendarRoutes(fastify, calendarService);
  exportRoutes(fastify, db);
  assistantRoutes(fastify, llmService);

  // Start background jobs
  startWeatherFetchJob(weatherService, gardenRepo);
}
