import type { FastifyInstance } from 'fastify';
import type { PlantInstanceService } from '../services/plant-instance.service.js';
import { PlantInstanceCreateSchema, PlantInstanceUpdateSchema, PlantInstanceStatusUpdateSchema, PlantInstanceHealthUpdateSchema } from '@gardenvault/shared';
import { validate } from '../utils/validate.js';
import { safeParseInt } from '../utils/parse.js';
import { z } from 'zod';

const SuccessionSchema = z.object({
  plant_catalog_id: z.string().uuid(),
  plot_id: z.string().uuid(),
  start_date: z.string().min(1),
  interval_days: z.number().int().positive(),
  count: z.number().int().min(1).max(20),
  planting_method: z.string().optional(),
  sub_plot_id: z.string().uuid().optional(),
});

export function plantInstanceRoutes(fastify: FastifyInstance, instanceService: PlantInstanceService) {
  fastify.get<{ Querystring: { limit?: string; offset?: string } }>('/api/v1/plant-instances', async (request) => {
    const { limit, offset } = request.query;
    const data = instanceService.findAll({
      limit: safeParseInt(limit, 20),
      offset: safeParseInt(offset, 0),
    });
    return { success: true, data };
  });

  fastify.post('/api/v1/plant-instances', async (request, reply) => {
    const body = validate(PlantInstanceCreateSchema, request.body);
    const instance = instanceService.create(body);
    reply.status(201);
    return { success: true, data: instance };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/plant-instances/:id', async (request) => {
    const instance = instanceService.findById(request.params.id);
    return { success: true, data: instance };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/plant-instances/:id', async (request) => {
    const body = validate(PlantInstanceUpdateSchema, request.body);
    const instance = instanceService.update(request.params.id, body);
    return { success: true, data: instance };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/plant-instances/:id', async (request, reply) => {
    instanceService.delete(request.params.id);
    reply.status(204);
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/plant-instances/:id/status', async (request) => {
    const body = validate(PlantInstanceStatusUpdateSchema, request.body);
    const instance = instanceService.updateStatus(request.params.id, body);
    return { success: true, data: instance };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/plant-instances/:id/health', async (request) => {
    const body = validate(PlantInstanceHealthUpdateSchema, request.body);
    const instance = instanceService.updateHealth(request.params.id, body);
    return { success: true, data: instance };
  });

  // Succession planting: create a series of staggered plant instances
  fastify.post('/api/v1/plant-instances/succession', async (request, reply) => {
    const body = validate(SuccessionSchema, request.body);
    const instances = instanceService.createSuccession(body);
    reply.status(201);
    return { success: true, data: instances };
  });
}
