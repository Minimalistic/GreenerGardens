import type { FastifyInstance } from 'fastify';
import type { PlantCatalogService } from '../services/plant-catalog.service.js';
import { NotFoundError } from '../utils/errors.js';
import { safeParseInt } from '../utils/parse.js';

export function plantCatalogRoutes(fastify: FastifyInstance, catalogService: PlantCatalogService) {
  fastify.get<{ Querystring: Record<string, string> }>('/api/v1/plant-catalog', async (request) => {
    const { search, plant_type, lifecycle, sun_exposure, water_needs, min_zone, max_zone, page, limit } = request.query;
    const result = catalogService.search({
      search,
      plant_type,
      lifecycle,
      sun_exposure,
      water_needs,
      min_zone: min_zone ? safeParseInt(min_zone, 1) : undefined,
      max_zone: max_zone ? safeParseInt(max_zone, 13) : undefined,
      page: safeParseInt(page, 1),
      limit: safeParseInt(limit, 20),
    });
    return { success: true, ...result };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/plant-catalog/:id', async (request) => {
    const plant = catalogService.findById(request.params.id);
    if (!plant) throw new NotFoundError('PlantCatalog', request.params.id);
    return { success: true, data: plant };
  });

  fastify.post('/api/v1/plant-catalog', async (request, reply) => {
    const plant = catalogService.create(request.body);
    return reply.status(201).send({ success: true, data: plant });
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/plant-catalog/:id', async (request) => {
    const plant = catalogService.update(request.params.id, request.body);
    return { success: true, data: plant };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/plant-catalog/:id', async (request, reply) => {
    catalogService.remove(request.params.id);
    return reply.status(204).send();
  });
}
