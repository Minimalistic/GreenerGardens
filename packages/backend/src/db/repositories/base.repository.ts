import type Database from 'better-sqlite3';

export type SqlParam = string | number | boolean | null;

export interface FindAllOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
}

export class BaseRepository<T extends Record<string, any>> {
  constructor(
    protected db: Database.Database,
    protected tableName: string,
  ) {}

  findById(id: string): T | undefined {
    return this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id) as T | undefined;
  }

  findAll(options: FindAllOptions = {}): T[] {
    const { limit = 20, offset = 0, orderBy = 'created_at', orderDir = 'DESC' } = options;
    return this.db.prepare(
      `SELECT * FROM ${this.tableName} ORDER BY ${orderBy} ${orderDir} LIMIT ? OFFSET ?`
    ).all(limit, offset) as T[];
  }

  count(): number {
    const row = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.tableName}`).get() as { count: number };
    return row.count;
  }

  insert(data: Record<string, any>): T {
    const entries = Object.entries(data).filter(([_, v]) => v !== undefined);
    const keys = entries.map(([k]) => k);
    const values = entries.map(([_, v]) => v);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    return this.db.prepare(sql).get(...values) as T;
  }

  update(id: string, data: Record<string, any>): T | undefined {
    const entries = Object.entries(data).filter(([_, v]) => v !== undefined);
    if (entries.length === 0) return this.findById(id);

    const sets = entries.map(([k]) => `${k} = ?`).join(', ');
    const values = entries.map(([_, v]) => v);

    return this.db.prepare(
      `UPDATE ${this.tableName} SET ${sets}, updated_at = datetime('now') WHERE id = ? RETURNING *`
    ).get(...values, id) as T | undefined;
  }

  delete(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
    return result.changes > 0;
  }
}
