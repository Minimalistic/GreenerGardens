import type { FastifyInstance } from 'fastify';
import type { GardenService } from '../services/garden.service.js';
import type { PlotService } from '../services/plot.service.js';

export function gardenRoutes(fastify: FastifyInstance, gardenService: GardenService, plotService: PlotService) {
  fastify.get('/api/v1/gardens', async () => {
    const data = gardenService.findAll();
    return { success: true, data };
  });

  fastify.post('/api/v1/gardens', async (request, reply) => {
    const garden = gardenService.create(request.body);
    reply.status(201);
    return { success: true, data: garden };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/gardens/:id', async (request) => {
    const garden = gardenService.findById(request.params.id);
    return { success: true, data: garden };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/gardens/:id', async (request) => {
    const garden = gardenService.update(request.params.id, request.body);
    return { success: true, data: garden };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/gardens/:id', async (request, reply) => {
    gardenService.delete(request.params.id);
    reply.status(204);
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/gardens/:id/plots', async (request) => {
    const data = plotService.findByGardenId(request.params.id);
    return { success: true, data };
  });
}
