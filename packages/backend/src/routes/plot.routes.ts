import type { FastifyInstance } from 'fastify';
import type { PlotService } from '../services/plot.service.js';
import type { SubPlotService } from '../services/sub-plot.service.js';

export function plotRoutes(fastify: FastifyInstance, plotService: PlotService, subPlotService: SubPlotService) {
  fastify.get('/api/v1/plots', async () => {
    const data = plotService.findAll();
    return { success: true, data };
  });

  fastify.post('/api/v1/plots', async (request, reply) => {
    const plot = plotService.create(request.body);
    reply.status(201);
    return { success: true, data: plot };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/plots/:id', async (request) => {
    const plot = plotService.findById(request.params.id);
    return { success: true, data: plot };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/plots/:id', async (request) => {
    const plot = plotService.update(request.params.id, request.body);
    return { success: true, data: plot };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/plots/:id', async (request, reply) => {
    plotService.delete(request.params.id);
    reply.status(204);
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/plots/:id/sub-plots', async (request) => {
    const data = subPlotService.findByPlotId(request.params.id);
    return { success: true, data };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/plots/:id/sub-plots-with-plants', async (request) => {
    const data = subPlotService.findByPlotIdWithPlantInfo(request.params.id);
    return { success: true, data };
  });
}
