import { v4 as uuid } from 'uuid';
import type Database from 'better-sqlite3';
import { TaskCreateSchema, TaskUpdateSchema } from '@gardenvault/shared';
import type { TaskRepository } from '../db/repositories/task.repository.js';
import type { HistoryLogger } from './history.middleware.js';
import { NotFoundError } from '../utils/errors.js';

export class TaskService {
  constructor(
    private db: Database.Database,
    private taskRepo: TaskRepository,
    private history: HistoryLogger,
  ) {}

  findAll(filters?: {
    status?: string;
    priority?: string;
    task_type?: string;
    due_before?: string;
    due_after?: string;
    limit?: number;
    offset?: number;
  }) {
    return this.taskRepo.findFiltered(filters ?? {});
  }

  findById(id: string) {
    const task = this.taskRepo.findById(id);
    if (!task) throw new NotFoundError('Task', id);
    return this.deserialize(task);
  }

  findOverdue() {
    return this.taskRepo.findOverdue().map(t => this.deserialize(t));
  }

  findDueToday() {
    return this.taskRepo.findDueToday().map(t => this.deserialize(t));
  }

  findDueThisWeek() {
    return this.taskRepo.findDueThisWeek().map(t => this.deserialize(t));
  }

  create(data: unknown) {
    const parsed = TaskCreateSchema.parse(data);
    const id = uuid();

    const row: Record<string, any> = {
      id,
      ...parsed,
      is_recurring: parsed.is_recurring ? 1 : 0,
      auto_generated: parsed.auto_generated ? 1 : 0,
    };

    const result = this.db.transaction(() => {
      const created = this.taskRepo.insert(row);
      this.history.logCreate('task', created);
      return created;
    })();

    return this.deserialize(result);
  }

  update(id: string, data: unknown) {
    const parsed = TaskUpdateSchema.parse(data);

    const updateData: Record<string, any> = { ...parsed };
    if (parsed.is_recurring !== undefined) updateData.is_recurring = parsed.is_recurring ? 1 : 0;
    if (parsed.auto_generated !== undefined) updateData.auto_generated = parsed.auto_generated ? 1 : 0;

    const result = this.db.transaction(() => {
      const old = this.taskRepo.findById(id);
      if (!old) throw new NotFoundError('Task', id);

      const updated = this.taskRepo.update(id, updateData);
      if (!updated) throw new NotFoundError('Task', id);

      this.history.logUpdate('task', id, old, updated);
      return updated;
    })();

    return this.deserialize(result);
  }

  complete(id: string) {
    return this.update(id, {
      status: 'completed',
      completed_date: new Date().toISOString().split('T')[0],
    });
  }

  skip(id: string) {
    return this.update(id, { status: 'skipped' });
  }

  delete(id: string): void {
    this.db.transaction(() => {
      const old = this.taskRepo.findById(id);
      if (!old) throw new NotFoundError('Task', id);

      this.taskRepo.delete(id);
      this.history.logDelete('task', old);
    })();
  }

  private deserialize(task: Record<string, any>) {
    return {
      ...task,
      is_recurring: Boolean(task.is_recurring),
      auto_generated: Boolean(task.auto_generated),
    };
  }
}
