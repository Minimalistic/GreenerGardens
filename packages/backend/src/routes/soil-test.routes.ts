import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import type { SoilTestService } from '../services/soil-test.service.js';
import { assertPlotOwnership } from '../utils/ownership.js';

export function soilTestRoutes(fastify: FastifyInstance, soilTestService: SoilTestService, db: Database.Database) {
  fastify.get<{ Querystring: { plot?: string; limit?: string; offset?: string } }>(
    '/api/v1/soil-tests',
    async (request) => {
      const { plot, limit, offset } = request.query;
      if (!plot) {
        return { success: false, error: { code: 'VALIDATION_ERROR', message: 'plot query parameter is required' } };
      }
      assertPlotOwnership(db, plot, request.userId);
      const data = soilTestService.findByPlot(plot, limit ? parseInt(limit) : undefined, offset ? parseInt(offset) : undefined);
      return { success: true, data };
    },
  );

  fastify.get<{ Querystring: { plot: string } }>(
    '/api/v1/soil-tests/trends',
    async (request) => {
      assertPlotOwnership(db, request.query.plot, request.userId);
      const data = soilTestService.findTrends(request.query.plot);
      return { success: true, data };
    },
  );

  fastify.post('/api/v1/soil-tests', async (request, reply) => {
    assertPlotOwnership(db, (request.body as any).plot_id, request.userId);
    const data = soilTestService.create(request.body);
    reply.status(201);
    return { success: true, data };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/soil-tests/:id', async (request) => {
    const test = db.prepare('SELECT plot_id FROM soil_tests WHERE id = ?').get(request.params.id) as { plot_id: string } | undefined;
    if (test) assertPlotOwnership(db, test.plot_id, request.userId);
    const data = soilTestService.findById(request.params.id);
    return { success: true, data };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/soil-tests/:id', async (request) => {
    const test = db.prepare('SELECT plot_id FROM soil_tests WHERE id = ?').get(request.params.id) as { plot_id: string } | undefined;
    if (test) assertPlotOwnership(db, test.plot_id, request.userId);
    const data = soilTestService.update(request.params.id, request.body);
    return { success: true, data };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/soil-tests/:id', async (request, reply) => {
    const test = db.prepare('SELECT plot_id FROM soil_tests WHERE id = ?').get(request.params.id) as { plot_id: string } | undefined;
    if (test) assertPlotOwnership(db, test.plot_id, request.userId);
    soilTestService.delete(request.params.id);
    reply.status(204);
  });
}
