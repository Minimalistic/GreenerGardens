import type { FastifyInstance } from 'fastify';
import type { GardenService } from '../services/garden.service.js';
import type { PlotService } from '../services/plot.service.js';

export function gardenRoutes(fastify: FastifyInstance, gardenService: GardenService, plotService: PlotService) {
  fastify.get('/api/v1/gardens', async (request) => {
    const data = gardenService.findAll(request.userId);
    return { success: true, data };
  });

  fastify.post('/api/v1/gardens', async (request, reply) => {
    const garden = gardenService.create(request.body, request.userId);
    reply.status(201);
    return { success: true, data: garden };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/gardens/:id', async (request) => {
    const garden = gardenService.findById(request.params.id, request.userId);
    return { success: true, data: garden };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/gardens/:id', async (request) => {
    const garden = gardenService.update(request.params.id, request.body, request.userId);
    return { success: true, data: garden };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/gardens/:id/deletion-impact', async (request) => {
    const data = gardenService.getDeletionImpact(request.params.id, request.userId);
    return { success: true, data };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/gardens/:id', async (request, reply) => {
    gardenService.delete(request.params.id, request.userId);
    reply.status(204);
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/gardens/:id/plots', async (request) => {
    gardenService.findById(request.params.id, request.userId);
    const data = plotService.findByGardenId(request.params.id);
    return { success: true, data };
  });
}
