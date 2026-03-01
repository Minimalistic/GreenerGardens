import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository.js';

export interface TaskRow {
  id: string;
  entity_type: string | null;
  entity_id: string | null;
  task_type: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed_date: string | null;
  is_recurring: number;
  recurrence_rule: string;
  priority: string;
  status: string;
  auto_generated: number;
  source_reason: string | null;
  created_at: string;
  updated_at: string;
}

export class TaskRepository extends BaseRepository<TaskRow> {
  constructor(db: Database.Database) {
    super(db, 'tasks');
  }

  findByStatus(status: string, limit: number = 50, offset: number = 0): TaskRow[] {
    return this.db.prepare(
      'SELECT * FROM tasks WHERE status = ? ORDER BY due_date ASC NULLS LAST, priority DESC LIMIT ? OFFSET ?'
    ).all(status, limit, offset) as TaskRow[];
  }

  findByEntity(entityType: string, entityId: string): TaskRow[] {
    return this.db.prepare(
      'SELECT * FROM tasks WHERE entity_type = ? AND entity_id = ? ORDER BY due_date ASC NULLS LAST'
    ).all(entityType, entityId) as TaskRow[];
  }

  findOverdue(): TaskRow[] {
    const today = new Date().toISOString().split('T')[0];
    return this.db.prepare(
      `SELECT * FROM tasks WHERE due_date < ? AND status NOT IN ('completed', 'skipped', 'cancelled') ORDER BY due_date ASC`
    ).all(today) as TaskRow[];
  }

  findDueToday(): TaskRow[] {
    const today = new Date().toISOString().split('T')[0];
    return this.db.prepare(
      `SELECT * FROM tasks WHERE due_date = ? AND status NOT IN ('completed', 'skipped', 'cancelled') ORDER BY priority DESC`
    ).all(today) as TaskRow[];
  }

  findDueThisWeek(): TaskRow[] {
    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const todayStr = today.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    return this.db.prepare(
      `SELECT * FROM tasks WHERE due_date BETWEEN ? AND ? AND status NOT IN ('completed', 'skipped', 'cancelled') ORDER BY due_date ASC, priority DESC`
    ).all(todayStr, weekEndStr) as TaskRow[];
  }

  findFiltered(filters: {
    status?: string;
    priority?: string;
    task_type?: string;
    due_before?: string;
    due_after?: string;
    limit?: number;
    offset?: number;
  }): TaskRow[] {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.status) {
      conditions.push('status = ?');
      params.push(filters.status);
    }
    if (filters.priority) {
      conditions.push('priority = ?');
      params.push(filters.priority);
    }
    if (filters.task_type) {
      conditions.push('task_type = ?');
      params.push(filters.task_type);
    }
    if (filters.due_before) {
      conditions.push('due_date <= ?');
      params.push(filters.due_before);
    }
    if (filters.due_after) {
      conditions.push('due_date >= ?');
      params.push(filters.due_after);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    return this.db.prepare(
      `SELECT * FROM tasks ${where} ORDER BY due_date ASC NULLS LAST, priority DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as TaskRow[];
  }
}
