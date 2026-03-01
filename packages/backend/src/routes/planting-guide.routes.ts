import type { FastifyInstance } from 'fastify';
import type { PlantingGuideService } from '../services/planting-guide.service.js';

export function plantingGuideRoutes(fastify: FastifyInstance, plantingGuideService: PlantingGuideService) {
  fastify.get<{ Querystring: { garden_id: string; date?: string } }>(
    '/api/v1/planting-guide',
    async (request) => {
      const data = plantingGuideService.getPlantingGuide(request.query.garden_id, request.query.date);
      return { success: true, data };
    },
  );
}
