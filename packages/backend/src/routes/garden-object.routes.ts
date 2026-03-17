import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import type { GardenObjectService } from '../services/garden-object.service.js';
import { assertGardenOwnership } from '../utils/ownership.js';

export function gardenObjectRoutes(fastify: FastifyInstance, service: GardenObjectService, db: Database.Database) {
  fastify.get<{ Params: { gardenId: string } }>('/api/v1/gardens/:gardenId/objects', async (request) => {
    assertGardenOwnership(db, request.params.gardenId, request.userId);
    const data = service.findByGardenId(request.params.gardenId);
    return { success: true, data };
  });

  fastify.post('/api/v1/garden-objects', async (request, reply) => {
    assertGardenOwnership(db, (request.body as any).garden_id, request.userId);
    const obj = service.create(request.body);
    reply.status(201);
    return { success: true, data: obj };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/garden-objects/:id', async (request) => {
    const row = db.prepare('SELECT garden_id FROM garden_objects WHERE id = ?').get(request.params.id) as { garden_id: string } | undefined;
    if (row) assertGardenOwnership(db, row.garden_id, request.userId);
    const obj = service.findById(request.params.id);
    return { success: true, data: obj };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/garden-objects/:id', async (request) => {
    const row = db.prepare('SELECT garden_id FROM garden_objects WHERE id = ?').get(request.params.id) as { garden_id: string } | undefined;
    if (row) assertGardenOwnership(db, row.garden_id, request.userId);
    const obj = service.update(request.params.id, request.body);
    return { success: true, data: obj };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/garden-objects/:id', async (request, reply) => {
    const row = db.prepare('SELECT garden_id FROM garden_objects WHERE id = ?').get(request.params.id) as { garden_id: string } | undefined;
    if (row) assertGardenOwnership(db, row.garden_id, request.userId);
    service.delete(request.params.id);
    reply.status(204);
  });
}
