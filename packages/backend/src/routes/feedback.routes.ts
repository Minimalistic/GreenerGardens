import type { FastifyInstance } from 'fastify';
import type { FeedbackService } from '../services/feedback.service.js';

export function feedbackRoutes(fastify: FastifyInstance, feedbackService: FeedbackService) {
  fastify.get<{ Querystring: { type?: string; status?: string; limit?: string; offset?: string } }>(
    '/api/v1/feedback',
    async (request) => {
      const { type, status, limit, offset } = request.query;
      const data = feedbackService.findAll({
        feedback_type: type,
        status,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
      });
      return { success: true, data };
    },
  );

  fastify.post('/api/v1/feedback', async (request, reply) => {
    const data = feedbackService.create(request.body);
    reply.status(201);
    return { success: true, data };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/feedback/:id', async (request) => {
    const data = feedbackService.findById(request.params.id);
    return { success: true, data };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/feedback/:id', async (request) => {
    const data = feedbackService.update(request.params.id, request.body);
    return { success: true, data };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/feedback/:id', async (request, reply) => {
    feedbackService.delete(request.params.id);
    reply.status(204);
  });
}
