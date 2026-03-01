import type { FastifyInstance } from 'fastify';
import type { AlertService } from '../services/alert.service.js';

export function alertRoutes(fastify: FastifyInstance, alertService: AlertService) {
  fastify.get<{ Querystring: { garden_id: string } }>(
    '/api/v1/alerts',
    async (request) => {
      const data = alertService.getActiveAlerts(request.query.garden_id);
      return { success: true, data };
    },
  );

  fastify.post<{ Querystring: { garden_id: string } }>(
    '/api/v1/alerts/check',
    async (request) => {
      const gardenId = request.query.garden_id;
      const frost = await alertService.checkFrostAlert(gardenId);
      const heat = await alertService.checkHeatAlert(gardenId);
      return { success: true, data: { frost, heat } };
    },
  );
}
