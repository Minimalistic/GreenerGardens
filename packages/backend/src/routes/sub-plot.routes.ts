import type { FastifyInstance } from 'fastify';
import type { SubPlotService } from '../services/sub-plot.service.js';

export function subPlotRoutes(fastify: FastifyInstance, subPlotService: SubPlotService) {
  fastify.get('/api/v1/sub-plots', async () => {
    const data = subPlotService.findAll();
    return { success: true, data };
  });

  fastify.post('/api/v1/sub-plots', async (request, reply) => {
    const sub = subPlotService.create(request.body);
    reply.status(201);
    return { success: true, data: sub };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/sub-plots/:id', async (request) => {
    const sub = subPlotService.findById(request.params.id);
    return { success: true, data: sub };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/sub-plots/:id', async (request) => {
    const sub = subPlotService.update(request.params.id, request.body);
    return { success: true, data: sub };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/sub-plots/:id', async (request, reply) => {
    subPlotService.delete(request.params.id);
    reply.status(204);
  });
}
