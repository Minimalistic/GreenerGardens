import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { runMigrations } from '../../src/db/migrate.js';
import { seedPlantCatalog } from '../../src/db/seed.js';
import { registerRoutes } from '../../src/routes/index.js';
import { NotFoundError, ValidationError } from '../../src/utils/errors.js';
import { ZodError } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../src/db/migrations');

interface TestApp {
  server: ReturnType<typeof Fastify>;
  db: Database.Database;
  close: () => Promise<void>;
}

export async function buildTestApp(options?: { seed?: boolean }): Promise<TestApp> {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');

  runMigrations(db, MIGRATIONS_DIR);

  if (options?.seed) {
    seedPlantCatalog(db);
  }

  const server = Fastify({ logger: false });

  await server.register(cors, { origin: true });
  await server.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  // Health check (same as app.ts)
  server.get('/api/v1/health', async () => {
    return { status: 'ok', name: 'GardenVault API', version: '0.1.0' };
  });

  registerRoutes(server, db);

  // Error handler (same as app.ts)
  server.setErrorHandler((error, _request, reply) => {
    if (error instanceof NotFoundError) {
      reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message },
      });
    } else if (error instanceof ValidationError) {
      reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message, details: error.details },
      });
    } else if (error instanceof ZodError) {
      reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: { issues: error.issues },
        },
      });
    } else {
      reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      });
    }
  });

  await server.ready();

  return {
    server,
    db,
    close: async () => {
      await server.close();
      db.close();
    },
  };
}
