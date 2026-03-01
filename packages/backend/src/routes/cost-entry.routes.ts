import type { FastifyInstance } from 'fastify';
import type { CostEntryService } from '../services/cost-entry.service.js';

export function costEntryRoutes(fastify: FastifyInstance, costService: CostEntryService) {
  fastify.get<{ Querystring: { category?: string; limit?: string; offset?: string } }>(
    '/api/v1/costs',
    async (request) => {
      const { category, limit, offset } = request.query;
      const data = costService.findAll({
        category,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      });
      return { success: true, data };
    },
  );

  fastify.get<{ Querystring: { year?: string } }>(
    '/api/v1/costs/summary',
    async (request) => {
      const year = request.query.year ? parseInt(request.query.year) : undefined;
      const data = costService.getSummary(year);
      return { success: true, data };
    },
  );

  fastify.get('/api/v1/costs/yearly', async () => {
    const data = costService.getTotalByYear();
    return { success: true, data };
  });

  fastify.post('/api/v1/costs', async (request, reply) => {
    const data = costService.create(request.body);
    reply.status(201);
    return { success: true, data };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/costs/:id', async (request) => {
    const data = costService.findById(request.params.id);
    return { success: true, data };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/costs/:id', async (request) => {
    const data = costService.update(request.params.id, request.body);
    return { success: true, data };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/costs/:id', async (request, reply) => {
    costService.delete(request.params.id);
    reply.status(204);
  });
}
