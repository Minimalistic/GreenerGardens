import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import type { HistoryLogger } from '../../services/history.middleware.js';
import type { AlertService } from '../../services/alert.service.js';
import type { GardenRepository } from '../../db/repositories/garden.repository.js';

import { SeedInventoryRepository } from '../../db/repositories/seed-inventory.repository.js';
import { CostEntryRepository } from '../../db/repositories/cost-entry.repository.js';

import { SeedInventoryService } from '../../services/seed-inventory.service.js';
import { CostEntryService } from '../../services/cost-entry.service.js';
import { AnalyticsService } from '../../services/analytics.service.js';
import { BackupService } from '../../services/backup.service.js';
import { TimelineService } from '../../services/timeline.service.js';
import { PushService } from '../../services/push.service.js';

import { exportRoutes } from '../export.routes.js';
import { seedInventoryRoutes } from '../seed-inventory.routes.js';
import { costEntryRoutes } from '../cost-entry.routes.js';
import { analyticsRoutes } from '../analytics.routes.js';
import { backupRoutes } from '../backup.routes.js';
import { timelineRoutes } from '../timeline.routes.js';
import { pushRoutes } from '../push.routes.js';
import { adminRoutes } from '../admin.routes.js';

export function registerDataRoutes(fastify: FastifyInstance, db: Database.Database, history: HistoryLogger, alertService: AlertService, gardenRepo: GardenRepository) {
  const seedInventoryRepo = new SeedInventoryRepository(db);
  const costEntryRepo = new CostEntryRepository(db);

  const seedInventoryService = new SeedInventoryService(db, seedInventoryRepo, history);
  const costEntryService = new CostEntryService(db, costEntryRepo, history);
  const analyticsService = new AnalyticsService(db);
  const backupService = new BackupService(db);
  const timelineService = new TimelineService(db);
  const pushService = new PushService(db);

  exportRoutes(fastify, db);
  seedInventoryRoutes(fastify, seedInventoryService);
  costEntryRoutes(fastify, costEntryService);
  analyticsRoutes(fastify, analyticsService);
  backupRoutes(fastify, backupService);
  timelineRoutes(fastify, timelineService);
  pushRoutes(fastify, pushService);
  adminRoutes(fastify, db, alertService, gardenRepo);

  return { pushService };
}
