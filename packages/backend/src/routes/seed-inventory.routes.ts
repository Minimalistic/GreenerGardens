import type { FastifyInstance } from 'fastify';
import type { SeedInventoryService } from '../services/seed-inventory.service.js';

export function seedInventoryRoutes(fastify: FastifyInstance, seedService: SeedInventoryService) {
  fastify.get<{ Querystring: { limit?: string; offset?: string; expiring_soon?: string; low_quantity?: string } }>(
    '/api/v1/seed-inventory',
    async (request) => {
      const { limit, offset, expiring_soon, low_quantity } = request.query;
      const data = seedService.findAll({
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
        expiring_soon: expiring_soon === 'true',
        low_quantity: low_quantity === 'true',
      });
      return { success: true, data };
    },
  );

  fastify.post('/api/v1/seed-inventory', async (request, reply) => {
    const data = seedService.create(request.body);
    reply.status(201);
    return { success: true, data };
  });

  // Static routes before parametric
  fastify.get<{ Params: { plantCatalogId: string } }>(
    '/api/v1/seed-inventory/plant/:plantCatalogId',
    async (request) => {
      const data = seedService.findByPlant(request.params.plantCatalogId);
      return { success: true, data };
    },
  );

  fastify.get<{ Params: { id: string } }>('/api/v1/seed-inventory/:id', async (request) => {
    const data = seedService.findById(request.params.id);
    return { success: true, data };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/seed-inventory/:id', async (request) => {
    const data = seedService.update(request.params.id, request.body);
    return { success: true, data };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/seed-inventory/:id', async (request, reply) => {
    seedService.delete(request.params.id);
    reply.status(204);
  });

  fastify.post<{ Params: { id: string }; Body: { count: number } }>(
    '/api/v1/seed-inventory/:id/deduct',
    async (request) => {
      const data = seedService.deductSeeds(request.params.id, (request.body as any).count ?? 1);
      return { success: true, data };
    },
  );
}
