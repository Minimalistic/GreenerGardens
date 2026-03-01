import type { FastifyInstance } from 'fastify';
import type { PestEventService } from '../services/pest-event.service.js';

export function pestEventRoutes(fastify: FastifyInstance, pestEventService: PestEventService) {
  fastify.get<{ Querystring: { entity_type?: string; entity_id?: string; pest_type?: string; outcome?: string; severity?: string; limit?: string; offset?: string } }>(
    '/api/v1/pest-events',
    async (request) => {
      const { entity_type, entity_id, pest_type, outcome, severity, limit, offset } = request.query;
      const data = pestEventService.findAll({
        entity_type, entity_id, pest_type, outcome, severity,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      });
      return { success: true, data };
    },
  );

  fastify.post('/api/v1/pest-events', async (request, reply) => {
    const data = pestEventService.create(request.body);
    reply.status(201);
    return { success: true, data };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/pest-events/:id', async (request) => {
    const data = pestEventService.findById(request.params.id);
    return { success: true, data };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/pest-events/:id', async (request) => {
    const data = pestEventService.update(request.params.id, request.body);
    return { success: true, data };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/pest-events/:id', async (request, reply) => {
    pestEventService.delete(request.params.id);
    reply.status(204);
  });

  fastify.get<{ Params: { entityType: string; entityId: string } }>(
    '/api/v1/pest-events/entity/:entityType/:entityId',
    async (request) => {
      const data = pestEventService.findByEntity(request.params.entityType, request.params.entityId);
      return { success: true, data };
    },
  );
}
