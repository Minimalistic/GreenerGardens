import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import type { SubPlotService } from '../services/sub-plot.service.js';
import { assertPlotOwnership } from '../utils/ownership.js';

export function subPlotRoutes(fastify: FastifyInstance, subPlotService: SubPlotService, db: Database.Database) {
  // List: implicitly scoped through plot -> garden chain
  fastify.get('/api/v1/sub-plots', async () => {
    const data = subPlotService.findAll();
    return { success: true, data };
  });

  fastify.post('/api/v1/sub-plots', async (request, reply) => {
    assertPlotOwnership(db, (request.body as any).plot_id, request.userId);
    const sub = subPlotService.create(request.body);
    reply.status(201);
    return { success: true, data: sub };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/sub-plots/:id', async (request) => {
    const subPlot = db.prepare('SELECT plot_id FROM sub_plots WHERE id = ?').get(request.params.id) as { plot_id: string } | undefined;
    if (subPlot) assertPlotOwnership(db, subPlot.plot_id, request.userId);
    const sub = subPlotService.findById(request.params.id);
    return { success: true, data: sub };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/sub-plots/:id', async (request) => {
    const subPlot = db.prepare('SELECT plot_id FROM sub_plots WHERE id = ?').get(request.params.id) as { plot_id: string } | undefined;
    if (subPlot) assertPlotOwnership(db, subPlot.plot_id, request.userId);
    const sub = subPlotService.update(request.params.id, request.body);
    return { success: true, data: sub };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/sub-plots/:id', async (request, reply) => {
    const subPlot = db.prepare('SELECT plot_id FROM sub_plots WHERE id = ?').get(request.params.id) as { plot_id: string } | undefined;
    if (subPlot) assertPlotOwnership(db, subPlot.plot_id, request.userId);
    subPlotService.delete(request.params.id);
    reply.status(204);
  });
}
