import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';

import { HistoryLogRepository } from '../db/repositories/history-log.repository.js';
import { createHistoryLogger } from '../services/history.middleware.js';

import { registerCoreRoutes } from './groups/core.routes.js';
import { registerTrackingRoutes } from './groups/tracking.routes.js';
import { registerKnowledgeRoutes } from './groups/knowledge.routes.js';
import { registerManagementRoutes } from './groups/management.routes.js';
import { registerDataRoutes } from './groups/data.routes.js';

import { startWeatherFetchJob, setAlertService, setPushService } from '../jobs/weather-fetch.job.js';

export function registerRoutes(fastify: FastifyInstance, db: Database.Database) {
  // Shared history logger
  const historyRepo = new HistoryLogRepository(db);
  const history = createHistoryLogger(historyRepo);

  // Register route groups
  const core = registerCoreRoutes(fastify, db, history);
  const tracking = registerTrackingRoutes(fastify, db, history);
  registerKnowledgeRoutes(fastify, db);
  registerManagementRoutes(fastify, db, history);
  const data = registerDataRoutes(fastify, db, history, tracking.alertService, tracking.gardenRepo);

  // Wire cross-service dependencies
  core.instanceService.setCalendarService(tracking.calendarService);
  core.instanceService.setTaskService(tracking.taskService);

  // Start background jobs
  setAlertService(tracking.alertService);
  setPushService(data.pushService);
  startWeatherFetchJob(tracking.weatherService, tracking.gardenRepo);
}
