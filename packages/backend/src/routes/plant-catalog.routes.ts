import type { FastifyInstance } from 'fastify';
import type { PlantCatalogService } from '../services/plant-catalog.service.js';
import { PlantCatalogCreateSchema, PlantCatalogUpdateSchema } from '@gardenvault/shared';
import { validate } from '../utils/validate.js';
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

  fastify.get<{ Params: { id: string } }>('/api/v1/plant-catalog/:id/activity', async (request) => {
    const activity = catalogService.getActivity(request.params.id);
    return { success: true, data: activity };
  });

  fastify.post('/api/v1/plant-catalog', async (request, reply) => {
    const body = validate(PlantCatalogCreateSchema, request.body);
    const plant = catalogService.create(body);
    return reply.status(201).send({ success: true, data: plant });
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/plant-catalog/:id', async (request) => {
    const body = validate(PlantCatalogUpdateSchema, request.body);
    const plant = catalogService.update(request.params.id, body);
    return { success: true, data: plant };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/plant-catalog/:id', async (request, reply) => {
    catalogService.remove(request.params.id);
    return reply.status(204).send();
  });
}
