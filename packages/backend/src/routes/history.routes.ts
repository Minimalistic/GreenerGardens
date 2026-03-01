import type { FastifyInstance } from 'fastify';
import type { HistoryLogService } from '../services/history-log.service.js';
import { safeParseInt } from '../utils/parse.js';

export function historyRoutes(fastify: FastifyInstance, historyService: HistoryLogService) {
  fastify.get<{ Querystring: { limit?: string; page?: string; entity_type?: string; action?: string; start_date?: string; end_date?: string } }>('/api/v1/history', async (request) => {
    const limit = safeParseInt(request.query.limit, 50);
    const page = safeParseInt(request.query.page, 1);
    const offset = (page - 1) * limit;
    const filters = {
      entity_type: request.query.entity_type || undefined,
      action: request.query.action || undefined,
      start_date: request.query.start_date || undefined,
      end_date: request.query.end_date || undefined,
    };
    const result = historyService.getFiltered(filters, limit, offset);
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
