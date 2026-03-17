import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import type { PlotService } from '../services/plot.service.js';
import type { SubPlotService } from '../services/sub-plot.service.js';
import { assertGardenOwnership, assertPlotOwnership } from '../utils/ownership.js';

export function plotRoutes(fastify: FastifyInstance, plotService: PlotService, subPlotService: SubPlotService, db: Database.Database) {
  fastify.get<{ Querystring: { garden_id?: string } }>('/api/v1/plots', async (request) => {
    const gardenId = (request.query as any).garden_id;
    if (gardenId) {
      assertGardenOwnership(db, gardenId, request.userId);
    }
    const data = plotService.findAll();
    return { success: true, data };
  });

  fastify.post('/api/v1/plots', async (request, reply) => {
    assertGardenOwnership(db, (request.body as any).garden_id, request.userId);
    const plot = plotService.create(request.body);
    reply.status(201);
    return { success: true, data: plot };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/plots/:id', async (request) => {
    assertPlotOwnership(db, request.params.id, request.userId);
    const plot = plotService.findById(request.params.id);
    return { success: true, data: plot };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/plots/:id', async (request) => {
    assertPlotOwnership(db, request.params.id, request.userId);
    const plot = plotService.update(request.params.id, request.body);
    return { success: true, data: plot };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/plots/:id/deletion-impact', async (request) => {
    assertPlotOwnership(db, request.params.id, request.userId);
    const data = plotService.getDeletionImpact(request.params.id);
    return { success: true, data };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/plots/:id', async (request, reply) => {
    assertPlotOwnership(db, request.params.id, request.userId);
    plotService.delete(request.params.id);
    reply.status(204);
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/plots/:id/sub-plots', async (request) => {
    assertPlotOwnership(db, request.params.id, request.userId);
    const data = subPlotService.findByPlotId(request.params.id);
    return { success: true, data };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/plots/:id/sub-plots-with-plants', async (request) => {
    assertPlotOwnership(db, request.params.id, request.userId);
    const data = subPlotService.findByPlotIdWithPlantInfo(request.params.id);
    return { success: true, data };
  });
}
