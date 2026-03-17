import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import type { PestEventService } from '../services/pest-event.service.js';
import { assertEntityOwnership } from '../utils/ownership.js';

export function pestEventRoutes(fastify: FastifyInstance, pestEventService: PestEventService, db: Database.Database) {
  // List: when entity_type/entity_id provided, verify ownership
  fastify.get<{ Querystring: { entity_type?: string; entity_id?: string; pest_type?: string; outcome?: string; severity?: string; limit?: string; offset?: string } }>(
    '/api/v1/pest-events',
    async (request) => {
      const { entity_type, entity_id, pest_type, outcome, severity, limit, offset } = request.query;
      if (entity_type && entity_id) {
        assertEntityOwnership(db, entity_type, entity_id, request.userId);
      }
      const data = pestEventService.findAll({
        entity_type, entity_id, pest_type, outcome, severity,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      });
      return { success: true, data };
    },
  );

  fastify.post('/api/v1/pest-events', async (request, reply) => {
    const body = request.body as any;
    if (body.entity_type && body.entity_id) {
      assertEntityOwnership(db, body.entity_type, body.entity_id, request.userId);
    }
    const data = pestEventService.create(request.body);
    reply.status(201);
    return { success: true, data };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/pest-events/:id', async (request) => {
    const event = db.prepare('SELECT entity_type, entity_id FROM pest_events WHERE id = ?').get(request.params.id) as { entity_type: string; entity_id: string } | undefined;
    if (event?.entity_type && event?.entity_id) {
      assertEntityOwnership(db, event.entity_type, event.entity_id, request.userId);
    }
    const data = pestEventService.findById(request.params.id);
    return { success: true, data };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/pest-events/:id', async (request) => {
    const event = db.prepare('SELECT entity_type, entity_id FROM pest_events WHERE id = ?').get(request.params.id) as { entity_type: string; entity_id: string } | undefined;
    if (event?.entity_type && event?.entity_id) {
      assertEntityOwnership(db, event.entity_type, event.entity_id, request.userId);
    }
    const data = pestEventService.update(request.params.id, request.body);
    return { success: true, data };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/pest-events/:id', async (request, reply) => {
    const event = db.prepare('SELECT entity_type, entity_id FROM pest_events WHERE id = ?').get(request.params.id) as { entity_type: string; entity_id: string } | undefined;
    if (event?.entity_type && event?.entity_id) {
      assertEntityOwnership(db, event.entity_type, event.entity_id, request.userId);
    }
    pestEventService.delete(request.params.id);
    reply.status(204);
  });

  fastify.get<{ Params: { entityType: string; entityId: string } }>(
    '/api/v1/pest-events/entity/:entityType/:entityId',
    async (request) => {
      assertEntityOwnership(db, request.params.entityType, request.params.entityId, request.userId);
      const data = pestEventService.findByEntity(request.params.entityType, request.params.entityId);
      return { success: true, data };
    },
  );
}
