import type Database from 'better-sqlite3';

interface TimelineEvent {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  timestamp: string;
  field_changes: Record<string, any> | null;
  snapshot: Record<string, any> | null;
  changed_by: string;
  notes: string | null;
}

interface TimelineMarker {
  date: string;
  count: number;
  types: Record<string, number>;
}

export class TimelineService {
  constructor(private db: Database.Database) {}

  getEvents(options: {
    start?: string;
    end?: string;
    entityTypes?: string[];
    limit?: number;
    offset?: number;
  }): TimelineEvent[] {
    const conditions: string[] = [];
    const params: any[] = [];

    if (options.start) {
      conditions.push('timestamp >= ?');
      params.push(options.start);
    }
    if (options.end) {
      conditions.push('timestamp <= ?');
      params.push(options.end);
    }
    if (options.entityTypes && options.entityTypes.length > 0) {
      conditions.push(`entity_type IN (${options.entityTypes.map(() => '?').join(',')})`);
      params.push(...options.entityTypes);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit ?? 100;
    const offset = options.offset ?? 0;

    const rows = this.db.prepare(
      `SELECT * FROM history_log ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as any[];

    return rows.map(row => ({
      ...row,
      field_changes: row.field_changes_json ? JSON.parse(row.field_changes_json) : null,
      snapshot: row.snapshot_json ? JSON.parse(row.snapshot_json) : null,
    }));
  }

  getMarkers(options: {
    start: string;
    end: string;
    zoom?: 'day' | 'week' | 'month';
  }): TimelineMarker[] {
    const zoom = options.zoom ?? 'day';
    let dateExpr: string;
    switch (zoom) {
      case 'month':
        dateExpr = "strftime('%Y-%m', timestamp)";
        break;
      case 'week':
        dateExpr = "strftime('%Y-W%W', timestamp)";
        break;
      default:
        dateExpr = "strftime('%Y-%m-%d', timestamp)";
    }

    const rows = this.db.prepare(`
      SELECT
        ${dateExpr} as date,
        COUNT(*) as count,
        entity_type,
        COUNT(*) as type_count
      FROM history_log
      WHERE timestamp BETWEEN ? AND ?
      GROUP BY date, entity_type
      ORDER BY date ASC
    `).all(options.start, options.end) as any[];

    // Aggregate by date
    const byDate = new Map<string, TimelineMarker>();
    for (const row of rows) {
      if (!byDate.has(row.date)) {
        byDate.set(row.date, { date: row.date, count: 0, types: {} });
      }
      const marker = byDate.get(row.date)!;
      marker.count += row.type_count;
      marker.types[row.entity_type] = (marker.types[row.entity_type] ?? 0) + row.type_count;
    }
    return Array.from(byDate.values());
  }

  getEntityState(entityType: string, entityId: string, targetDate: string): Record<string, any> | null {
    // Find the most recent snapshot at or before targetDate
    const row = this.db.prepare(`
      SELECT snapshot_json FROM history_log
      WHERE entity_type = ? AND entity_id = ? AND timestamp <= ?
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(entityType, entityId, targetDate) as any;

    if (!row || !row.snapshot_json) return null;
    return JSON.parse(row.snapshot_json);
  }

  getActivitySummary(): {
    total_events: number;
    first_event: string | null;
    last_event: string | null;
    events_by_type: Record<string, number>;
  } {
    const total = (this.db.prepare('SELECT COUNT(*) as count FROM history_log').get() as any).count;

    const first = this.db.prepare('SELECT MIN(timestamp) as ts FROM history_log').get() as any;
    const last = this.db.prepare('SELECT MAX(timestamp) as ts FROM history_log').get() as any;

    const typeRows = this.db.prepare(
      'SELECT entity_type, COUNT(*) as count FROM history_log GROUP BY entity_type'
    ).all() as any[];

    const events_by_type: Record<string, number> = {};
    for (const row of typeRows) {
      events_by_type[row.entity_type] = row.count;
    }

    return {
      total_events: total,
      first_event: first?.ts ?? null,
      last_event: last?.ts ?? null,
      events_by_type,
    };
  }
}
