import type { FastifyInstance } from 'fastify';
import type { PlantCatalogService } from '../services/plant-catalog.service.js';
import { NotFoundError } from '../utils/errors.js';

export function plantCatalogRoutes(fastify: FastifyInstance, catalogService: PlantCatalogService) {
  fastify.get<{ Querystring: Record<string, string> }>('/api/v1/plant-catalog', async (request) => {
    const { search, plant_type, lifecycle, sun_exposure, water_needs, min_zone, max_zone, page, limit } = request.query;
    const result = catalogService.search({
      search,
      plant_type,
      lifecycle,
      sun_exposure,
      water_needs,
      min_zone: min_zone ? parseInt(min_zone) : undefined,
      max_zone: max_zone ? parseInt(max_zone) : undefined,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
    return { success: true, ...result };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/plant-catalog/:id', async (request) => {
    const plant = catalogService.findById(request.params.id);
    if (!plant) throw new NotFoundError('PlantCatalog', request.params.id);
    return { success: true, data: plant };
  });
}
