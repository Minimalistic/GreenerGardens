import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import type { GardenRepository } from '../db/repositories/garden.repository.js';
import { seedTestData } from '../db/seed-test-data.js';

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
  gardenRepo: GardenRepository,
) {
  // Clear all user data (keeps plant catalog reference data) — admin only
  fastify.post('/api/v1/admin/reset-database', async (_request, reply) => {
    if (!_request.user?.is_admin) {
      reply.status(403);
      return { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } };
    }
    clearAllUserData(db);
    reply.status(200);
    return {
      success: true,
      data: { message: 'All user data has been cleared. Plant catalog preserved.' },
    };
  });

  // Clear all user data and populate with test/demo data — admin only
  fastify.post('/api/v1/admin/seed-test-data', async (_request, reply) => {
    if (!_request.user?.is_admin) {
      reply.status(403);
      return { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } };
    }
    clearAllUserData(db);
    const summary = seedTestData(db);

    reply.status(200);
    return {
      success: true,
      data: { message: 'Database seeded with test data.', summary },
    };
  });
}
