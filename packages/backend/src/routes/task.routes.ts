import type { FastifyInstance } from 'fastify';
import type { TaskService } from '../services/task.service.js';
import { safeParseInt } from '../utils/parse.js';

export function taskRoutes(fastify: FastifyInstance, taskService: TaskService) {
  fastify.get<{ Querystring: { status?: string; priority?: string; task_type?: string; due_before?: string; due_after?: string; limit?: string; offset?: string } }>('/api/v1/tasks', async (request) => {
    const { status, priority, task_type, due_before, due_after, limit, offset } = request.query;
    const data = taskService.findAll({
      status,
      priority,
      task_type,
      due_before,
      due_after,
      limit: safeParseInt(limit, 50),
      offset: safeParseInt(offset, 0),
    });
    return { success: true, data };
  });

  fastify.get('/api/v1/tasks/overdue', async () => {
    const data = taskService.findOverdue();
    return { success: true, data };
  });

  fastify.get('/api/v1/tasks/today', async () => {
    const data = taskService.findDueToday();
    return { success: true, data };
  });

  fastify.get('/api/v1/tasks/week', async () => {
    const data = taskService.findDueThisWeek();
    return { success: true, data };
  });

  fastify.post('/api/v1/tasks', async (request, reply) => {
    const task = taskService.create(request.body);
    reply.status(201);
    return { success: true, data: task };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/tasks/:id', async (request) => {
    const task = taskService.findById(request.params.id);
    return { success: true, data: task };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/tasks/:id', async (request) => {
    const task = taskService.update(request.params.id, request.body);
    return { success: true, data: task };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/tasks/:id/complete', async (request) => {
    const task = taskService.complete(request.params.id);
    return { success: true, data: task };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/tasks/:id/skip', async (request) => {
    const task = taskService.skip(request.params.id);
    return { success: true, data: task };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/tasks/:id', async (request, reply) => {
    taskService.delete(request.params.id);
    reply.status(204);
  });
}
