import type { FastifyInstance } from 'fastify';
import type { PestCatalogService } from '../services/pest-catalog.service.js';
import { PestCatalogCreateSchema, PestCatalogUpdateSchema } from '@gardenvault/shared';
import { validate } from '../utils/validate.js';
import { NotFoundError } from '../utils/errors.js';
import { safeParseInt } from '../utils/parse.js';

export function pestCatalogRoutes(fastify: FastifyInstance, pestCatalogService: PestCatalogService) {
  fastify.get<{ Querystring: Record<string, string> }>('/api/v1/pest-catalog', async (request) => {
    const { search, category, severity, affected_plant, page, limit } = request.query;
    const result = pestCatalogService.search({
      search,
      category,
      severity,
      affected_plant,
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
    });
    return { success: true, ...result };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/pest-catalog/:id', async (request) => {
    const pest = pestCatalogService.findById(request.params.id);
    if (!pest) throw new NotFoundError('PestCatalog', request.params.id);
    return { success: true, data: pest };
  });

  fastify.post('/api/v1/pest-catalog', async (request, reply) => {
    const body = validate(PestCatalogCreateSchema, request.body);
    const pest = pestCatalogService.create(body);
    return reply.status(201).send({ success: true, data: pest });
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/pest-catalog/:id', async (request) => {
    const body = validate(PestCatalogUpdateSchema, request.body);
    const pest = pestCatalogService.update(request.params.id, body);
    return { success: true, data: pest };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/pest-catalog/:id', async (request, reply) => {
    pestCatalogService.remove(request.params.id);
    return reply.status(204).send();
  });
}
