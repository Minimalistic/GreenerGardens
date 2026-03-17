import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import type { TaskService } from '../services/task.service.js';
import { safeParseInt } from '../utils/parse.js';
import { assertEntityOwnership } from '../utils/ownership.js';

export function taskRoutes(fastify: FastifyInstance, taskService: TaskService, db: Database.Database) {
  // List endpoints: implicitly scoped through garden chain; frontend only fetches tasks for user's gardens
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
    const body = request.body as any;
    if (body.entity_type && body.entity_id) {
      assertEntityOwnership(db, body.entity_type, body.entity_id, request.userId);
    }
    const task = taskService.create(request.body);
    reply.status(201);
    return { success: true, data: task };
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/tasks/:id', async (request) => {
    const task = db.prepare('SELECT entity_type, entity_id FROM tasks WHERE id = ?').get(request.params.id) as { entity_type: string; entity_id: string } | undefined;
    if (task?.entity_type && task?.entity_id) {
      assertEntityOwnership(db, task.entity_type, task.entity_id, request.userId);
    }
    const data = taskService.findById(request.params.id);
    return { success: true, data };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/tasks/:id', async (request) => {
    const task = db.prepare('SELECT entity_type, entity_id FROM tasks WHERE id = ?').get(request.params.id) as { entity_type: string; entity_id: string } | undefined;
    if (task?.entity_type && task?.entity_id) {
      assertEntityOwnership(db, task.entity_type, task.entity_id, request.userId);
    }
    const data = taskService.update(request.params.id, request.body);
    return { success: true, data };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/tasks/:id/complete', async (request) => {
    const task = db.prepare('SELECT entity_type, entity_id FROM tasks WHERE id = ?').get(request.params.id) as { entity_type: string; entity_id: string } | undefined;
    if (task?.entity_type && task?.entity_id) {
      assertEntityOwnership(db, task.entity_type, task.entity_id, request.userId);
    }
    const data = taskService.complete(request.params.id);
    return { success: true, data };
  });

  fastify.patch<{ Params: { id: string } }>('/api/v1/tasks/:id/skip', async (request) => {
    const task = db.prepare('SELECT entity_type, entity_id FROM tasks WHERE id = ?').get(request.params.id) as { entity_type: string; entity_id: string } | undefined;
    if (task?.entity_type && task?.entity_id) {
      assertEntityOwnership(db, task.entity_type, task.entity_id, request.userId);
    }
    const data = taskService.skip(request.params.id);
    return { success: true, data };
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/tasks/:id', async (request, reply) => {
    const task = db.prepare('SELECT entity_type, entity_id FROM tasks WHERE id = ?').get(request.params.id) as { entity_type: string; entity_id: string } | undefined;
    if (task?.entity_type && task?.entity_id) {
      assertEntityOwnership(db, task.entity_type, task.entity_id, request.userId);
    }
    taskService.delete(request.params.id);
    reply.status(204);
  });
}
