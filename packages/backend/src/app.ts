import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb } from './db/connection.js';
import { runMigrations } from './db/migrate.js';
import { seedPlantCatalog, updatePlantImages } from './db/seed.js';
import { registerRoutes } from './routes/index.js';
import { NotFoundError, ValidationError } from './utils/errors.js';
import { ZodError } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function buildApp() {
  const server = Fastify({ logger: true });

  // CORS
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  });

  // Multipart file upload support
  await server.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  });

  // Serve uploaded files
  const uploadPath = path.resolve(process.env.UPLOAD_PATH || 'data/uploads');
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  await server.register(fastifyStatic, {
    root: uploadPath,
    prefix: '/uploads/',
    decorateReply: false,
  });

  // Serve frontend static files in production
  const frontendDist = path.resolve(__dirname, '../../../frontend/dist');
  if (fs.existsSync(frontendDist)) {
    await server.register(fastifyStatic, {
      root: frontendDist,
      prefix: '/',
      wildcard: false,
      decorateReply: false,
    });
  }

  // Initialize database
  const db = getDb();
  runMigrations(db);

  // Seed plant catalog
  seedPlantCatalog(db);
  updatePlantImages(db);

  // Health check
  server.get('/api/v1/health', async () => {
    return { status: 'ok', name: 'GardenVault API', version: '0.1.0' };
  });

  // Register all routes
  registerRoutes(server, db);

  // SPA fallback: serve index.html for non-API routes in production
  if (fs.existsSync(frontendDist)) {
    server.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.url} not found` },
        });
      } else {
        reply.sendFile('index.html');
      }
    });
  }

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
