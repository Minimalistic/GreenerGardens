import type { FastifyInstance } from 'fastify';
import type { NoteService } from '../services/note.service.js';

export function noteRoutes(fastify: FastifyInstance, noteService: NoteService) {
  fastify.get<{ Querystring: { pinned?: string; limit?: string; offset?: string } }>(
    '/api/v1/notes',
    async (request) => {
      const { pinned, limit, offset } = request.query;
      const data = noteService.findAll({
        pinned: pinned !== undefined ? pinned === 'true' : undefined,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      });
      return { success: true, data };
    },
  );

  fastify.post('/api/v1/notes', async (request, reply) => {
    const data = noteService.create(request.body);
    reply.status(201);
    return { success: true, data };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/notes/:id', async (request) => {
    const data = noteService.findById(request.params.id);
    return { success: true, data };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/notes/:id', async (request) => {
    const data = noteService.update(request.params.id, request.body);
    return { success: true, data };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/notes/:id', async (request, reply) => {
    noteService.delete(request.params.id);
    reply.status(204);
  });

  fastify.get<{ Params: { date: string } }>(
    '/api/v1/notes/date/:date',
    async (request) => {
      const data = noteService.findByDate(request.params.date);
      return { success: true, data };
    },
  );

  fastify.get<{ Params: { entityType: string; entityId: string } }>(
    '/api/v1/notes/entity/:entityType/:entityId',
    async (request) => {
      const data = noteService.findByEntity(request.params.entityType, request.params.entityId);
      return { success: true, data };
    },
  );
}
