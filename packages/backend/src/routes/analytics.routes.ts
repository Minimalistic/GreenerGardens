import type { FastifyInstance } from 'fastify';
import type { AnalyticsService } from '../services/analytics.service.js';
import { safeParseInt } from '../utils/parse.js';

export function analyticsRoutes(fastify: FastifyInstance, analyticsService: AnalyticsService) {
  fastify.get<{ Querystring: { year?: string; groupBy?: string } }>(
    '/api/v1/analytics/harvests',
    async (request) => {
      const year = request.query.year ? safeParseInt(request.query.year, new Date().getFullYear()) : undefined;
      const groupBy = request.query.groupBy ?? 'plant';
      let data;
      switch (groupBy) {
        case 'plot':
          data = analyticsService.getYieldByPlot(request.userId, year);
          break;
        case 'month':
          data = analyticsService.getSeasonalTimeline(request.userId, year);
          break;
        default:
          data = analyticsService.getYieldByPlant(request.userId, year);
      }
      return { success: true, data };
    },
  );

  fastify.get<{ Querystring: { year?: string } }>(
    '/api/v1/analytics/harvests/destinations',
    async (request) => {
      const year = request.query.year ? safeParseInt(request.query.year, new Date().getFullYear()) : undefined;
      const data = analyticsService.getDestinationBreakdown(request.userId, year);
      return { success: true, data };
    },
  );

  fastify.get('/api/v1/analytics/harvests/compare', async (request) => {
    const data = analyticsService.getYearOverYear(request.userId);
    return { success: true, data };
  });
}
