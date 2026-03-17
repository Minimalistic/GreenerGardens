import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import type { PlantInstanceService } from '../services/plant-instance.service.js';
import { replyError } from '../utils/reply-error.js';
import { safeParseInt } from '../utils/parse.js';
import { assertPlotOwnership, assertPlantInstanceOwnership } from '../utils/ownership.js';

export function plantInstanceRoutes(fastify: FastifyInstance, instanceService: PlantInstanceService, db: Database.Database) {
  // List: implicitly scoped through garden chain in frontend queries
  fastify.get<{ Querystring: { limit?: string; offset?: string } }>('/api/v1/plant-instances', async (request) => {
    const { limit, offset } = request.query;
    const data = instanceService.findAll({
      limit: safeParseInt(limit, 20),
      offset: safeParseInt(offset, 0),
    });
    return { success: true, data };
  });

  fastify.post('/api/v1/plant-instances', async (request, reply) => {
    assertPlotOwnership(db, (request.body as any).plot_id, request.userId);
    const instance = instanceService.create(request.body);
    reply.status(201);
    return { success: true, data: instance };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/plant-instances/:id', async (request) => {
    assertPlantInstanceOwnership(db, request.params.id, request.userId);
    const instance = instanceService.findById(request.params.id);
    return { success: true, data: instance };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/plant-instances/:id', async (request) => {
    assertPlantInstanceOwnership(db, request.params.id, request.userId);
    const instance = instanceService.update(request.params.id, request.body);
    return { success: true, data: instance };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/plant-instances/:id', async (request, reply) => {
    assertPlantInstanceOwnership(db, request.params.id, request.userId);
    instanceService.delete(request.params.id);
    reply.status(204);
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/plant-instances/:id/status', async (request) => {
    assertPlantInstanceOwnership(db, request.params.id, request.userId);
    const instance = instanceService.updateStatus(request.params.id, request.body);
    return { success: true, data: instance };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/plant-instances/:id/health', async (request) => {
    assertPlantInstanceOwnership(db, request.params.id, request.userId);
    const instance = instanceService.updateHealth(request.params.id, request.body);
    return { success: true, data: instance };
  });

  // Succession planting: create a series of staggered plant instances
  fastify.post('/api/v1/plant-instances/succession', async (request, reply) => {
    const body = request.body as {
      plant_catalog_id: string;
      plot_id: string;
      start_date: string;
      interval_days: number;
      count: number;
      planting_method?: string;
      sub_plot_id?: string;
    };

    if (!body.plant_catalog_id || !body.plot_id || !body.start_date || !body.interval_days || !body.count) {
      return replyError(reply, 400, 'VALIDATION_ERROR', 'plant_catalog_id, plot_id, start_date, interval_days, and count are required');
    }

    if (body.count < 1 || body.count > 20) {
      return replyError(reply, 400, 'VALIDATION_ERROR', 'count must be between 1 and 20');
    }

    assertPlotOwnership(db, body.plot_id, request.userId);
    const instances = instanceService.createSuccession(body);
    reply.status(201);
    return { success: true, data: instances };
  });
}
