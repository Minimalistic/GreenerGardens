import type { FastifyInstance } from 'fastify';
import type { TagService } from '../services/tag.service.js';

export function tagRoutes(fastify: FastifyInstance, tagService: TagService) {
  fastify.get('/api/v1/tags', async (request) => {
    const data = tagService.findAll(request.userId);
    return { success: true, data };
  });

  fastify.post('/api/v1/tags', async (request, reply) => {
    const data = tagService.create(request.body, request.userId);
    reply.status(201);
    return { success: true, data };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/tags/:id', async (request) => {
    const data = tagService.update(request.params.id, request.body, request.userId);
    return { success: true, data };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/tags/:id', async (request, reply) => {
    tagService.delete(request.params.id, request.userId);
    reply.status(204);
  });

  fastify.post<{ Params: { id: string }; Body: { entity_type: string; entity_id: string } }>('/api/v1/tags/:id/entities', async (request, reply) => {
    const { entity_type, entity_id } = request.body;
    tagService.addEntityTag(request.params.id, entity_type, entity_id, request.userId);
    reply.status(201);
    return { success: true };
  });

  fastify.delete<{ Params: { id: string; entityType: string; entityId: string } }>(
    '/api/v1/tags/:id/entities/:entityType/:entityId',
    async (request, reply) => {
      tagService.removeEntityTag(request.params.id, request.params.entityType, request.params.entityId, request.userId);
      reply.status(204);
    },
  );

  fastify.get<{ Params: { id: string } }>('/api/v1/tags/:id/entities', async (request) => {
    const data = tagService.findEntitiesByTag(request.params.id, request.userId);
    return { success: true, data };
  });
}
