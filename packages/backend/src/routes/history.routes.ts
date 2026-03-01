import type { FastifyInstance } from 'fastify';
import type { HistoryLogService } from '../services/history-log.service.js';
import { safeParseInt } from '../utils/parse.js';

export function historyRoutes(fastify: FastifyInstance, historyService: HistoryLogService) {
  fastify.get<{ Querystring: { limit?: string; page?: string } }>('/api/v1/history', async (request) => {
    const limit = safeParseInt(request.query.limit, 20);
    const page = safeParseInt(request.query.page, 1);
    const offset = (page - 1) * limit;
    const result = historyService.getRecent(limit, offset);
    return { success: true, ...result };
  });

  fastify.get<{ Params: { entityType: string; entityId: string } }>(
    '/api/v1/history/:entityType/:entityId',
    async (request) => {
      const data = historyService.getByEntity(request.params.entityType, request.params.entityId);
      return { success: true, data };
    }
  );
}
