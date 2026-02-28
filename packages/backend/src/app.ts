import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getDb } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { seedPlantCatalog } from './db/seed.js';
import { registerRoutes } from './routes/index.js';
import { NotFoundError, ValidationError } from './utils/errors.js';
import { ZodError } from 'zod';

export async function buildApp() {
  const server = Fastify({ logger: true });

  // CORS
  await server.register(cors, {
    origin: true,
    credentials: true,
  });

  // Initialize database
  const db = getDb();
  runMigrations(db);

  // Seed plant catalog
  seedPlantCatalog(db);

  // Health check
  server.get('/api/v1/health', async () => {
    return { status: 'ok', name: 'GardenVault API', version: '0.1.0' };
  });

  // Register all routes
  registerRoutes(server, db);

  // Global error handler
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
      server.log.error(error);
      reply.status(500).send({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      });
    }
  });

  return server;
}
