import type { FastifyInstance } from 'fastify';
import type { WikipediaService } from '../services/wikipedia.service.js';

export function wikipediaRoutes(fastify: FastifyInstance, wikipediaService: WikipediaService) {
  fastify.get<{ Params: { id: string } }>(
    '/api/v1/plant-catalog/:id/wikipedia',
    async (request) => {
      const result = await wikipediaService.getSummary(request.params.id);
      return { success: true, data: result.data, cached: result.cached };
    },
  );
}
