import type { FastifyInstance } from 'fastify';
import type { GardenService } from '../services/garden.service.js';

export function setupRoutes(fastify: FastifyInstance, gardenService: GardenService) {
  fastify.get('/api/v1/setup/status', async (request) => {
    return { success: true, data: gardenService.getSetupStatus(request.userId) };
  });

  fastify.post('/api/v1/setup/garden', async (request, reply) => {
    // If a garden already exists (e.g., from auto-create), update it instead of creating a duplicate
    const existing = gardenService.findAll(request.userId);
    if (existing.length > 0) {
      const updated = gardenService.update(existing[0].id, request.body, request.userId);
      return { success: true, data: updated };
    }
    const garden = gardenService.create(request.body, request.userId);
    reply.status(201);
    return { success: true, data: garden };
  });
}
