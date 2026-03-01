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
import { UploadRepository } from '../db/repositories/upload.repository.js';
import { PestEventRepository } from '../db/repositories/pest-event.repository.js';
import { SoilTestRepository } from '../db/repositories/soil-test.repository.js';
import { NoteRepository } from '../db/repositories/note.repository.js';
import { TagRepository } from '../db/repositories/tag.repository.js';
import { SeedInventoryRepository } from '../db/repositories/seed-inventory.repository.js';
import { CostEntryRepository } from '../db/repositories/cost-entry.repository.js';

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
import { UploadService } from '../services/upload.service.js';
import { PestEventService } from '../services/pest-event.service.js';
import { SoilTestService } from '../services/soil-test.service.js';
import { NoteService } from '../services/note.service.js';
import { TagService } from '../services/tag.service.js';
import { CompanionService } from '../services/companion.service.js';
import { RotationService } from '../services/rotation.service.js';
import { SearchService } from '../services/search.service.js';
import { AlertService } from '../services/alert.service.js';
import { PlantingGuideService } from '../services/planting-guide.service.js';
import { SeedInventoryService } from '../services/seed-inventory.service.js';
import { CostEntryService } from '../services/cost-entry.service.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { BackupService } from '../services/backup.service.js';

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
import { uploadRoutes } from './upload.routes.js';
import { pestEventRoutes } from './pest-event.routes.js';
import { soilTestRoutes } from './soil-test.routes.js';
import { noteRoutes } from './note.routes.js';
import { tagRoutes } from './tag.routes.js';
import { companionRoutes } from './companion.routes.js';
import { rotationRoutes } from './rotation.routes.js';
import { searchRoutes } from './search.routes.js';
import { alertRoutes } from './alert.routes.js';
import { plantingGuideRoutes } from './planting-guide.routes.js';
import { seedInventoryRoutes } from './seed-inventory.routes.js';
import { costEntryRoutes } from './cost-entry.routes.js';
import { analyticsRoutes } from './analytics.routes.js';
import { backupRoutes } from './backup.routes.js';

import { startWeatherFetchJob, setAlertService } from '../jobs/weather-fetch.job.js';

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
  const uploadRepo = new UploadRepository(db);
  const pestEventRepo = new PestEventRepository(db);
  const soilTestRepo = new SoilTestRepository(db);
  const noteRepo = new NoteRepository(db);
  const tagRepo = new TagRepository(db);
  const seedInventoryRepo = new SeedInventoryRepository(db);
  const costEntryRepo = new CostEntryRepository(db);

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
  const uploadService = new UploadService(db, uploadRepo);
  const pestEventService = new PestEventService(db, pestEventRepo, history);
  const soilTestService = new SoilTestService(db, soilTestRepo, history);
  const noteService = new NoteService(db, noteRepo, history);
  const tagService = new TagService(db, tagRepo);
  const companionService = new CompanionService(db, catalogRepo);
  const rotationService = new RotationService(db, catalogRepo);
  const searchService = new SearchService(db);
  const alertService = new AlertService(db, weatherService, taskRepo, gardenRepo);
  const plantingGuideService = new PlantingGuideService(db, gardenRepo, catalogRepo);
  const seedInventoryService = new SeedInventoryService(db, seedInventoryRepo, history);
  const costEntryService = new CostEntryService(db, costEntryRepo, history);
  const analyticsService = new AnalyticsService(db);
  const backupService = new BackupService(db);

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
  uploadRoutes(fastify, uploadService);
  pestEventRoutes(fastify, pestEventService);
  soilTestRoutes(fastify, soilTestService);
  noteRoutes(fastify, noteService);
  tagRoutes(fastify, tagService);
  companionRoutes(fastify, companionService);
  rotationRoutes(fastify, rotationService);
  searchRoutes(fastify, searchService);
  alertRoutes(fastify, alertService);
  plantingGuideRoutes(fastify, plantingGuideService);
  seedInventoryRoutes(fastify, seedInventoryService);
  costEntryRoutes(fastify, costEntryService);
  analyticsRoutes(fastify, analyticsService);
  backupRoutes(fastify, backupService);

  // Start background jobs
  setAlertService(alertService);
  startWeatherFetchJob(weatherService, gardenRepo);
}
