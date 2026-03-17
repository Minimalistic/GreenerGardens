import type { FastifyInstance } from 'fastify';
import type { SearchService } from '../services/search.service.js';

export function searchRoutes(fastify: FastifyInstance, searchService: SearchService) {
  fastify.get<{ Querystring: { q: string; limit?: string } }>(
    '/api/v1/search',
    async (request) => {
      const { q, limit } = request.query;
      if (!q || q.trim().length === 0) {
        return { success: true, data: [] };
      }
      const data = searchService.search(q.trim(), request.userId, limit ? parseInt(limit) : 50);
      return { success: true, data };
    },
  );
}
