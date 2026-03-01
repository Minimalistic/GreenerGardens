import type { FastifyInstance } from 'fastify';
import type { TimelineService } from '../services/timeline.service.js';

export function timelineRoutes(fastify: FastifyInstance, timelineService: TimelineService) {
  fastify.get<{ Querystring: { start?: string; end?: string; types?: string; limit?: string; offset?: string } }>(
    '/api/v1/timeline/events',
    async (request) => {
      const { start, end, types, limit, offset } = request.query;
      const data = timelineService.getEvents({
        start,
        end,
        entityTypes: types ? types.split(',') : undefined,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      });
      return { success: true, data };
    },
  );

  fastify.get<{ Querystring: { start: string; end: string; zoom?: string } }>(
    '/api/v1/timeline/markers',
    async (request) => {
      const { start, end, zoom } = request.query;
      const data = timelineService.getMarkers({
        start,
        end,
        zoom: (zoom as 'day' | 'week' | 'month') ?? 'day',
      });
      return { success: true, data };
    },
  );

  fastify.get<{ Params: { entityType: string; entityId: string }; Querystring: { date: string } }>(
    '/api/v1/timeline/state/:entityType/:entityId',
    async (request) => {
      const data = timelineService.getEntityState(
        request.params.entityType,
        request.params.entityId,
        request.query.date,
      );
      return { success: true, data };
    },
  );

  fastify.get('/api/v1/timeline/summary', async () => {
    const data = timelineService.getActivitySummary();
    return { success: true, data };
  });
}
