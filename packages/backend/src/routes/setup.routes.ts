import type { FastifyInstance } from 'fastify';
import type { GardenService } from '../services/garden.service.js';

export function setupRoutes(fastify: FastifyInstance, gardenService: GardenService) {
  fastify.get('/api/v1/setup/status', async () => {
    return { success: true, data: gardenService.getSetupStatus() };
  });

  fastify.post('/api/v1/setup/garden', async (request, reply) => {
    // If a garden already exists (e.g., from auto-create), update it instead of creating a duplicate
    const existing = gardenService.findAll();
    if (existing.length > 0) {
      const updated = gardenService.update(existing[0].id, request.body);
      return { success: true, data: updated };
    }
    const garden = gardenService.create(request.body);
    reply.status(201);
    return { success: true, data: garden };
  });
}
