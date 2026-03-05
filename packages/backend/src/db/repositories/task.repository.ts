import type Database from 'better-sqlite3';
import { BaseRepository, type SqlParam } from './base.repository.js';

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
  entity_name: string | null;
  created_at: string;
  updated_at: string;
}

const ENTITY_JOIN = `
  LEFT JOIN plant_instances pi ON t.entity_type = 'plant_instance' AND t.entity_id = pi.id
  LEFT JOIN plant_catalog pc ON pi.plant_catalog_id = pc.id
  LEFT JOIN gardens g ON t.entity_type = 'garden' AND t.entity_id = g.id
  LEFT JOIN plots p ON t.entity_type = 'plot' AND t.entity_id = p.id
`;

const ENTITY_SELECT = `t.*, COALESCE(pc.common_name, g.name, p.name, NULL) AS entity_name`;

export class TaskRepository extends BaseRepository<TaskRow> {
  constructor(db: Database.Database) {
    super(db, 'tasks');
  }

  findByStatus(status: string, limit: number = 50, offset: number = 0): TaskRow[] {
    return this.db.prepare(
      `SELECT ${ENTITY_SELECT} FROM tasks t ${ENTITY_JOIN} WHERE t.status = ? ORDER BY t.due_date ASC NULLS LAST, t.priority DESC LIMIT ? OFFSET ?`
    ).all(status, limit, offset) as TaskRow[];
  }

  findByEntity(entityType: string, entityId: string): TaskRow[] {
    return this.db.prepare(
      `SELECT ${ENTITY_SELECT} FROM tasks t ${ENTITY_JOIN} WHERE t.entity_type = ? AND t.entity_id = ? ORDER BY t.due_date ASC NULLS LAST`
    ).all(entityType, entityId) as TaskRow[];
  }

  findOverdue(): TaskRow[] {
    const today = new Date().toISOString().split('T')[0];
    return this.db.prepare(
      `SELECT ${ENTITY_SELECT} FROM tasks t ${ENTITY_JOIN} WHERE t.due_date < ? AND t.status NOT IN ('completed', 'skipped', 'cancelled') ORDER BY t.due_date ASC`
    ).all(today) as TaskRow[];
  }

  findDueToday(): TaskRow[] {
    const today = new Date().toISOString().split('T')[0];
    return this.db.prepare(
      `SELECT ${ENTITY_SELECT} FROM tasks t ${ENTITY_JOIN} WHERE t.due_date = ? AND t.status NOT IN ('completed', 'skipped', 'cancelled') ORDER BY t.priority DESC`
    ).all(today) as TaskRow[];
  }

  findDueThisWeek(): TaskRow[] {
    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const todayStr = today.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];
    return this.db.prepare(
      `SELECT ${ENTITY_SELECT} FROM tasks t ${ENTITY_JOIN} WHERE t.due_date BETWEEN ? AND ? AND t.status NOT IN ('completed', 'skipped', 'cancelled') ORDER BY t.due_date ASC, t.priority DESC`
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
    const params: SqlParam[] = [];

    if (filters.status) {
      conditions.push('t.status = ?');
      params.push(filters.status);
    }
    if (filters.priority) {
      conditions.push('t.priority = ?');
      params.push(filters.priority);
    }
    if (filters.task_type) {
      conditions.push('t.task_type = ?');
      params.push(filters.task_type);
    }
    if (filters.due_before) {
      conditions.push('t.due_date <= ?');
      params.push(filters.due_before);
    }
    if (filters.due_after) {
      conditions.push('t.due_date >= ?');
      params.push(filters.due_after);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    return this.db.prepare(
      `SELECT ${ENTITY_SELECT} FROM tasks t ${ENTITY_JOIN} ${where} ORDER BY t.due_date ASC NULLS LAST, t.priority DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as TaskRow[];
  }
}
