import type { FastifyInstance } from 'fastify';
import type { PlantInstanceService } from '../services/plant-instance.service.js';

export function plantInstanceRoutes(fastify: FastifyInstance, instanceService: PlantInstanceService) {
  fastify.get<{ Querystring: { limit?: string; offset?: string } }>('/api/v1/plant-instances', async (request) => {
    const { limit, offset } = request.query;
    const data = instanceService.findAll({
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    });
    return { success: true, data };
  });

  fastify.post('/api/v1/plant-instances', async (request, reply) => {
    const instance = instanceService.create(request.body);
    reply.status(201);
    return { success: true, data: instance };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/plant-instances/:id', async (request) => {
    const instance = instanceService.findById(request.params.id);
    return { success: true, data: instance };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/plant-instances/:id', async (request) => {
    const instance = instanceService.update(request.params.id, request.body);
    return { success: true, data: instance };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/plant-instances/:id', async (request, reply) => {
    instanceService.delete(request.params.id);
    reply.status(204);
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/plant-instances/:id/status', async (request) => {
    const instance = instanceService.updateStatus(request.params.id, request.body);
    return { success: true, data: instance };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/plant-instances/:id/health', async (request) => {
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
      reply.status(400);
      return { success: false, error: 'plant_catalog_id, plot_id, start_date, interval_days, and count are required' };
    }

    if (body.count < 1 || body.count > 20) {
      reply.status(400);
      return { success: false, error: 'count must be between 1 and 20' };
    }

    const instances = instanceService.createSuccession(body);
    reply.status(201);
    return { success: true, data: instances };
  });
}
