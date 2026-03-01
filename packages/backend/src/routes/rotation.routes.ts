import type { FastifyInstance } from 'fastify';
import type { RotationService } from '../services/rotation.service.js';

export function rotationRoutes(fastify: FastifyInstance, rotationService: RotationService) {
  fastify.get<{ Querystring: { plot: string; plant: string } }>(
    '/api/v1/rotation/check',
    async (request) => {
      const data = rotationService.checkRotation(request.query.plot, request.query.plant);
      return { success: true, data };
    },
  );

  fastify.get<{ Querystring: { plot: string; years?: string } }>(
    '/api/v1/rotation/history',
    async (request) => {
      const years = request.query.years ? parseInt(request.query.years) : 5;
      const data = rotationService.getPlotHistory(request.query.plot, years);
      return { success: true, data };
    },
  );

  fastify.get<{ Querystring: { plant: string; garden?: string } }>(
    '/api/v1/rotation/suggest',
    async (request) => {
      if (!request.query.garden) {
        return { success: false, error: { code: 'VALIDATION_ERROR', message: 'garden query parameter required' } };
      }
      const data = rotationService.suggestPlots(request.query.plant, request.query.garden);
      return { success: true, data };
    },
  );
}
