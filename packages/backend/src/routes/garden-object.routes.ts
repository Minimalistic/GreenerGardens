import type { FastifyInstance } from 'fastify';
import type { GardenObjectService } from '../services/garden-object.service.js';

export function gardenObjectRoutes(fastify: FastifyInstance, service: GardenObjectService) {
  fastify.get<{ Params: { gardenId: string } }>('/api/v1/gardens/:gardenId/objects', async (request) => {
    const data = service.findByGardenId(request.params.gardenId);
    return { success: true, data };
  });

  fastify.post('/api/v1/garden-objects', async (request, reply) => {
    const obj = service.create(request.body);
    reply.status(201);
    return { success: true, data: obj };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/garden-objects/:id', async (request) => {
    const obj = service.findById(request.params.id);
    return { success: true, data: obj };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/garden-objects/:id', async (request) => {
    const obj = service.update(request.params.id, request.body);
    return { success: true, data: obj };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/garden-objects/:id', async (request, reply) => {
    service.delete(request.params.id);
    reply.status(204);
  });
}
