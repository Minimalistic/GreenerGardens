import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import type { HarvestService } from '../services/harvest.service.js';
import { safeParseInt } from '../utils/parse.js';
import { assertPlantInstanceOwnership } from '../utils/ownership.js';

export function harvestRoutes(fastify: FastifyInstance, harvestService: HarvestService, db: Database.Database) {
  // List: implicitly scoped through plant_instance -> plot -> garden chain
  fastify.get<{ Querystring: { limit?: string; offset?: string } }>('/api/v1/harvests', async (request) => {
    const { limit, offset } = request.query;
    const data = harvestService.findAll({
      limit: safeParseInt(limit, 20),
      offset: safeParseInt(offset, 0),
    });
    return { success: true, data };
  });

  // Stats: implicitly scoped aggregate
  fastify.get('/api/v1/harvests/stats', async () => {
    const data = harvestService.getStats();
    return { success: true, data };
  });

  fastify.post('/api/v1/harvests', async (request, reply) => {
    assertPlantInstanceOwnership(db, (request.body as any).plant_instance_id, request.userId);
    const harvest = harvestService.create(request.body);
    reply.status(201);
    return { success: true, data: harvest };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/harvests/:id', async (request) => {
    const harvest = db.prepare('SELECT plant_instance_id FROM harvests WHERE id = ?').get(request.params.id) as { plant_instance_id: string } | undefined;
    if (harvest) assertPlantInstanceOwnership(db, harvest.plant_instance_id, request.userId);
    const data = harvestService.findById(request.params.id);
    return { success: true, data };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/harvests/:id', async (request) => {
    const harvest = db.prepare('SELECT plant_instance_id FROM harvests WHERE id = ?').get(request.params.id) as { plant_instance_id: string } | undefined;
    if (harvest) assertPlantInstanceOwnership(db, harvest.plant_instance_id, request.userId);
    const data = harvestService.update(request.params.id, request.body);
    return { success: true, data };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/harvests/:id', async (request, reply) => {
    const harvest = db.prepare('SELECT plant_instance_id FROM harvests WHERE id = ?').get(request.params.id) as { plant_instance_id: string } | undefined;
    if (harvest) assertPlantInstanceOwnership(db, harvest.plant_instance_id, request.userId);
    harvestService.delete(request.params.id);
    reply.status(204);
  });
}
