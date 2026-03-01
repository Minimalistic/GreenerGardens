import type { FastifyInstance } from 'fastify';
import type { TagService } from '../services/tag.service.js';

export function tagRoutes(fastify: FastifyInstance, tagService: TagService) {
  fastify.get('/api/v1/tags', async () => {
    const data = tagService.findAll();
    return { success: true, data };
  });

  fastify.post('/api/v1/tags', async (request, reply) => {
    const data = tagService.create(request.body);
    reply.status(201);
    return { success: true, data };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/tags/:id', async (request) => {
    const data = tagService.update(request.params.id, request.body);
    return { success: true, data };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/tags/:id', async (request, reply) => {
    tagService.delete(request.params.id);
    reply.status(204);
  });

  fastify.post<{ Params: { id: string } }>('/api/v1/tags/:id/entities', async (request, reply) => {
    const { entity_type, entity_id } = request.body as any;
    tagService.addEntityTag(request.params.id, entity_type, entity_id);
    reply.status(201);
    return { success: true };
  });

  fastify.delete<{ Params: { id: string; entityType: string; entityId: string } }>(
    '/api/v1/tags/:id/entities/:entityType/:entityId',
    async (request, reply) => {
      tagService.removeEntityTag(request.params.id, request.params.entityType, request.params.entityId);
      reply.status(204);
    },
  );

  fastify.get<{ Params: { id: string } }>('/api/v1/tags/:id/entities', async (request) => {
    const data = tagService.findEntitiesByTag(request.params.id);
    return { success: true, data };
  });
}
