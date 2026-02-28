import type { FastifyInstance } from 'fastify';
import type { HarvestService } from '../services/harvest.service.js';

export function harvestRoutes(fastify: FastifyInstance, harvestService: HarvestService) {
  fastify.get<{ Querystring: { limit?: string; offset?: string } }>('/api/v1/harvests', async (request) => {
    const { limit, offset } = request.query;
    const data = harvestService.findAll({
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    });
    return { success: true, data };
  });

  fastify.get('/api/v1/harvests/stats', async () => {
    const data = harvestService.getStats();
    return { success: true, data };
  });

  fastify.post('/api/v1/harvests', async (request, reply) => {
    const harvest = harvestService.create(request.body);
    reply.status(201);
    return { success: true, data: harvest };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/harvests/:id', async (request) => {
    const harvest = harvestService.findById(request.params.id);
    return { success: true, data: harvest };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/harvests/:id', async (request) => {
    const harvest = harvestService.update(request.params.id, request.body);
    return { success: true, data: harvest };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/harvests/:id', async (request, reply) => {
    harvestService.delete(request.params.id);
    reply.status(204);
  });
}
