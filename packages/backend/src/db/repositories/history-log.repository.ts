import type Database from 'better-sqlite3';

export interface HistoryLogRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  timestamp: string;
  field_changes_json: string | null;
  snapshot_json: string | null;
  changed_by: string;
  notes: string | null;
}

export class HistoryLogRepository {
  constructor(private db: Database.Database) {}

  insert(data: {
    id: string;
    entity_type: string;
    entity_id: string;
    action: string;
    timestamp: string;
    field_changes_json: string | null;
    snapshot_json: string | null;
    changed_by: string;
    notes: string | null;
  }): HistoryLogRow {
    return this.db.prepare(`
      INSERT INTO history_log (id, entity_type, entity_id, action, timestamp, field_changes_json, snapshot_json, changed_by, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).get(
      data.id, data.entity_type, data.entity_id, data.action,
      data.timestamp, data.field_changes_json, data.snapshot_json, data.changed_by, data.notes
    ) as HistoryLogRow;
  }

  findByEntity(entityType: string, entityId: string): HistoryLogRow[] {
    return this.db.prepare(
      'SELECT * FROM history_log WHERE entity_type = ? AND entity_id = ? ORDER BY timestamp DESC'
    ).all(entityType, entityId) as HistoryLogRow[];
  }

  findRecent(limit: number = 20, offset: number = 0): HistoryLogRow[] {
    return this.db.prepare(
      'SELECT * FROM history_log ORDER BY timestamp DESC LIMIT ? OFFSET ?'
    ).all(limit, offset) as HistoryLogRow[];
  }

  findByDateRange(startDate: string, endDate: string, limit: number = 100): HistoryLogRow[] {
    return this.db.prepare(
      'SELECT * FROM history_log WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC LIMIT ?'
    ).all(startDate, endDate, limit) as HistoryLogRow[];
  }

  count(): number {
    return (this.db.prepare('SELECT COUNT(*) as count FROM history_log').get() as any).count;
  }

  findFiltered(
    filters: { entity_type?: string; action?: string; start_date?: string; end_date?: string },
    limit: number = 50,
    offset: number = 0
  ): HistoryLogRow[] {
    const { sql, params } = this.buildFilterClause(filters);
    return this.db.prepare(
      `SELECT * FROM history_log${sql} ORDER BY timestamp DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as HistoryLogRow[];
  }

  countFiltered(filters: { entity_type?: string; action?: string; start_date?: string; end_date?: string }): number {
    const { sql, params } = this.buildFilterClause(filters);
    return (this.db.prepare(
      `SELECT COUNT(*) as count FROM history_log${sql}`
    ).get(...params) as any).count;
  }

  private buildFilterClause(filters: { entity_type?: string; action?: string; start_date?: string; end_date?: string }) {
    const conditions: string[] = [];
    const params: string[] = [];
    if (filters.entity_type) { conditions.push('entity_type = ?'); params.push(filters.entity_type); }
    if (filters.action) { conditions.push('action = ?'); params.push(filters.action); }
    if (filters.start_date) { conditions.push('timestamp >= ?'); params.push(filters.start_date); }
    if (filters.end_date) { conditions.push('timestamp <= ?'); params.push(filters.end_date + 'T23:59:59.999Z'); }
    const sql = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    return { sql, params };
  }
}
