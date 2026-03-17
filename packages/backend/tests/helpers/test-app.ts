import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import Database from 'better-sqlite3';
import path from 'path';
import { createHash, randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { runMigrations } from '../../src/db/migrate.js';
import { seedPlantCatalog } from '../../src/db/seed.js';
import { registerRoutes } from '../../src/routes/index.js';
import { registerAuthRoutes } from '../../src/routes/auth.routes.js';
import { AuthService } from '../../src/services/auth.service.js';
import { authMiddleware } from '../../src/middleware/auth.middleware.js';
import { NotFoundError, ValidationError } from '../../src/utils/errors.js';
import { ZodError } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../../src/db/migrations');

interface TestApp {
  server: ReturnType<typeof Fastify>;
  db: Database.Database;
  authService: AuthService;
  close: () => Promise<void>;
}

/**
 * Create a test user and return the session cookie string.
 * Useful for authenticating test requests.
 */
export async function createTestUser(
  authService: AuthService,
  db: Database.Database,
  overrides?: { email?: string; displayName?: string; password?: string; isAdmin?: boolean }
): Promise<{ userId: string; cookie: string }> {
  const email = overrides?.email ?? `test-${randomBytes(4).toString('hex')}@test.local`;
  const displayName = overrides?.displayName ?? 'Test User';
  const password = overrides?.password ?? 'testpassword123';

  const { user, token } = await authService.register(email, displayName, password);

  if (overrides?.isAdmin) {
    db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(user.id);
  }

  return {
    userId: user.id,
    cookie: `gv_session=${token}`,
  };
}

/**
 * Helper to inject an authenticated request into the test server.
 */
export function authenticatedInject(
  server: ReturnType<typeof Fastify>,
  sessionCookie: string,
) {
  return (opts: { method: string; url: string; payload?: unknown; headers?: Record<string, string> }) => {
    return server.inject({
      method: opts.method as any,
      url: opts.url,
      payload: opts.payload,
      headers: {
        ...opts.headers,
        cookie: sessionCookie,
      },
    });
  };
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
  await server.register(cookie as any);
  await server.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  const authService = new AuthService(db);

  // Health check (public)
  server.get('/api/v1/health', async () => {
    return { status: 'ok', name: 'GardenVault API', version: '0.1.0' };
  });

  // Auth routes (public)
  registerAuthRoutes(server, authService);

  // Protected routes
  server.register(async (protectedScope) => {
    protectedScope.addHook('preHandler', authMiddleware(authService));
    registerRoutes(protectedScope, db);
  });

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
    authService,
    close: async () => {
      await server.close();
      db.close();
    },
  };
}
