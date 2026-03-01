import type { FastifyInstance } from 'fastify';
import type { CompanionService } from '../services/companion.service.js';

export function companionRoutes(fastify: FastifyInstance, companionService: CompanionService) {
  fastify.get<{ Querystring: { plant: string; neighbors?: string } }>(
    '/api/v1/companion/check',
    async (request) => {
      const { plant, neighbors } = request.query;
      const neighborIds = neighbors ? neighbors.split(',').filter(Boolean) : [];
      const data = companionService.checkCompatibility(plant, neighborIds);
      return { success: true, data };
    },
  );

  fastify.get<{ Querystring: { plant: string; plot?: string } }>(
    '/api/v1/companion/suggestions',
    async (request) => {
      const { plant, plot } = request.query;
      if (plot) {
        const data = companionService.suggestCompanions(plant, plot);
        return { success: true, data };
      }
      const data = companionService.getCompanions(plant);
      return { success: true, data };
    },
  );
}
