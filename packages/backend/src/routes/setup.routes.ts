import type { FastifyInstance } from 'fastify';
import type { GardenService } from '../services/garden.service.js';

export function setupRoutes(fastify: FastifyInstance, gardenService: GardenService) {
  fastify.get('/api/v1/setup/status', async () => {
    return { success: true, data: gardenService.getSetupStatus() };
  });

  fastify.post('/api/v1/setup/garden', async (request, reply) => {
    const garden = gardenService.create(request.body);
    reply.status(201);
    return { success: true, data: garden };
  });
}
