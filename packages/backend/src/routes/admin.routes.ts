import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import type { AlertService } from '../services/alert.service.js';
import type { GardenRepository } from '../db/repositories/garden.repository.js';
import { seedTestData } from '../db/seed-test-data.js';
import { requireAdminKey } from '../utils/auth.js';

// All user-data tables to clear (preserves plant_catalog and migrations)
const USER_DATA_TABLES = [
  'llm_messages',
  'llm_conversations',
  'entity_tags',
  'cost_entries',
  'seed_inventory',
  'harvests',
  'pest_events',
  'soil_tests',
  'notes',
  'tasks',
  'weather_daily_summary',
  'weather_readings',
  'uploads',
  'sub_plots',
  'plant_instances',
  'plots',
  'push_subscriptions',
  'tags',
  'history_log',
  'gardens',
];

function clearAllUserData(db: Database.Database) {
  const clear = db.transaction(() => {
    // Temporarily disable foreign keys for clean truncation
    db.pragma('foreign_keys = OFF');
    for (const table of USER_DATA_TABLES) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
    db.pragma('foreign_keys = ON');
  });
  clear();
}

export function adminRoutes(
  fastify: FastifyInstance,
  db: Database.Database,
  alertService: AlertService,
  gardenRepo: GardenRepository,
) {
  // Clear all user data (keeps plant catalog reference data)
  fastify.post('/api/v1/admin/reset-database', { preHandler: [requireAdminKey] }, async (_request, reply) => {
    clearAllUserData(db);
    reply.status(200);
    return {
      success: true,
      data: { message: 'All user data has been cleared. Plant catalog preserved.' },
    };
  });

  // Clear all user data and populate with test/demo data
  fastify.post('/api/v1/admin/seed-test-data', { preHandler: [requireAdminKey] }, async (_request, reply) => {
    clearAllUserData(db);
    const summary = seedTestData(db);

    // Re-generate weather alerts for the newly seeded gardens
    try {
      const gardens = gardenRepo.findAll({ limit: 100 });
      for (const garden of gardens) {
        await alertService.checkFrostAlert(garden.id);
        await alertService.checkHeatAlert(garden.id);
      }
    } catch (err: any) {
      console.error(`[Admin] Post-seed alert check failed: ${err.message}`);
    }

    reply.status(200);
    return {
      success: true,
      data: { message: 'Database seeded with test data.', summary },
    };
  });
}
