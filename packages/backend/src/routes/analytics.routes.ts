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
          data = analyticsService.getYieldByPlot(year);
          break;
        case 'month':
          data = analyticsService.getSeasonalTimeline(year);
          break;
        default:
          data = analyticsService.getYieldByPlant(year);
      }
      return { success: true, data };
    },
  );

  fastify.get<{ Querystring: { year?: string } }>(
    '/api/v1/analytics/harvests/destinations',
    async (request) => {
      const year = request.query.year ? safeParseInt(request.query.year, new Date().getFullYear()) : undefined;
      const data = analyticsService.getDestinationBreakdown(year);
      return { success: true, data };
    },
  );

  fastify.get('/api/v1/analytics/harvests/compare', async () => {
    const data = analyticsService.getYearOverYear();
    return { success: true, data };
  });
}
