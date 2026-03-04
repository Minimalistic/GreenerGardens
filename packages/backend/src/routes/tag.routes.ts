import type { FastifyInstance } from 'fastify';
import type { TagService } from '../services/tag.service.js';
import { TagCreateSchema, TagUpdateSchema, EntityTagSchema } from '@gardenvault/shared';
import { validate } from '../utils/validate.js';

export function tagRoutes(fastify: FastifyInstance, tagService: TagService) {
  fastify.get('/api/v1/tags', async () => {
    const data = tagService.findAll();
    return { success: true, data };
  });

  fastify.post('/api/v1/tags', async (request, reply) => {
    const body = validate(TagCreateSchema, request.body);
    const data = tagService.create(body);
    reply.status(201);
    return { success: true, data };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/tags/:id', async (request) => {
    const body = validate(TagUpdateSchema, request.body);
    const data = tagService.update(request.params.id, body);
    return { success: true, data };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/tags/:id', async (request, reply) => {
    tagService.delete(request.params.id);
    reply.status(204);
  });

  fastify.post<{ Params: { id: string } }>('/api/v1/tags/:id/entities', async (request, reply) => {
    const body = validate(EntityTagSchema.pick({ entity_type: true, entity_id: true }), request.body);
    tagService.addEntityTag(request.params.id, body.entity_type, body.entity_id);
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
