import type { FastifyInstance } from 'fastify';
import type { SoilTestService } from '../services/soil-test.service.js';

export function soilTestRoutes(fastify: FastifyInstance, soilTestService: SoilTestService) {
  fastify.get<{ Querystring: { plot?: string; limit?: string; offset?: string } }>(
    '/api/v1/soil-tests',
    async (request) => {
      const { plot, limit, offset } = request.query;
      if (!plot) {
        return { success: false, error: { code: 'VALIDATION_ERROR', message: 'plot query parameter is required' } };
      }
      const data = soilTestService.findByPlot(plot, limit ? parseInt(limit) : undefined, offset ? parseInt(offset) : undefined);
      return { success: true, data };
    },
  );

  fastify.get<{ Querystring: { plot: string } }>(
    '/api/v1/soil-tests/trends',
    async (request) => {
      const data = soilTestService.findTrends(request.query.plot);
      return { success: true, data };
    },
  );

  fastify.post('/api/v1/soil-tests', async (request, reply) => {
    const data = soilTestService.create(request.body);
    reply.status(201);
    return { success: true, data };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/soil-tests/:id', async (request) => {
    const data = soilTestService.findById(request.params.id);
    return { success: true, data };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/soil-tests/:id', async (request) => {
    const data = soilTestService.update(request.params.id, request.body);
    return { success: true, data };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/soil-tests/:id', async (request, reply) => {
    soilTestService.delete(request.params.id);
    reply.status(204);
  });
}
