import type { FastifyInstance } from 'fastify';
import type { CostEntryService } from '../services/cost-entry.service.js';
import { CostEntryCreateSchema, CostEntryUpdateSchema } from '@gardenvault/shared';
import { validate } from '../utils/validate.js';
import { safeParseInt } from '../utils/parse.js';

export function costEntryRoutes(fastify: FastifyInstance, costService: CostEntryService) {
  fastify.get<{ Querystring: { category?: string; limit?: string; offset?: string } }>(
    '/api/v1/costs',
    async (request) => {
      const { category, limit, offset } = request.query;
      const data = costService.findAll({
        category,
        limit: limit ? safeParseInt(limit, 20) : undefined,
        offset: offset ? safeParseInt(offset, 0) : undefined,
      });
      return { success: true, data };
    },
  );

  fastify.get<{ Querystring: { year?: string } }>(
    '/api/v1/costs/summary',
    async (request) => {
      const year = request.query.year ? safeParseInt(request.query.year, new Date().getFullYear()) : undefined;
      const data = costService.getSummary(year);
      return { success: true, data };
    },
  );

  fastify.get('/api/v1/costs/yearly', async () => {
    const data = costService.getTotalByYear();
    return { success: true, data };
  });

  fastify.post('/api/v1/costs', async (request, reply) => {
    const body = validate(CostEntryCreateSchema, request.body);
    const data = costService.create(body);
    reply.status(201);
    return { success: true, data };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/costs/:id', async (request) => {
    const data = costService.findById(request.params.id);
    return { success: true, data };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/costs/:id', async (request) => {
    const body = validate(CostEntryUpdateSchema, request.body);
    const data = costService.update(request.params.id, body);
    return { success: true, data };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/costs/:id', async (request, reply) => {
    costService.delete(request.params.id);
    reply.status(204);
  });
}
