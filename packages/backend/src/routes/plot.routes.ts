import type { FastifyInstance } from 'fastify';
import type { PlotService } from '../services/plot.service.js';
import type { SubPlotService } from '../services/sub-plot.service.js';
import { PlotCreateSchema, PlotUpdateSchema } from '@gardenvault/shared';
import { validate } from '../utils/validate.js';

export function plotRoutes(fastify: FastifyInstance, plotService: PlotService, subPlotService: SubPlotService) {
  fastify.get('/api/v1/plots', async () => {
    const data = plotService.findAll();
    return { success: true, data };
  });

  fastify.post('/api/v1/plots', async (request, reply) => {
    const body = validate(PlotCreateSchema, request.body);
    const plot = plotService.create(body);
    reply.status(201);
    return { success: true, data: plot };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/plots/:id', async (request) => {
    const plot = plotService.findById(request.params.id);
    return { success: true, data: plot };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/plots/:id', async (request) => {
    const body = validate(PlotUpdateSchema, request.body);
    const plot = plotService.update(request.params.id, body);
    return { success: true, data: plot };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/plots/:id/deletion-impact', async (request) => {
    const data = plotService.getDeletionImpact(request.params.id);
    return { success: true, data };
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
