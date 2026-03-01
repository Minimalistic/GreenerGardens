import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository.js';

export interface CostEntryRow {
  id: string;
  category: string;
  entity_type: string | null;
  entity_id: string | null;
  amount_cents: number;
  description: string;
  purchase_date: string;
  vendor: string | null;
  receipt_upload_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export class CostEntryRepository extends BaseRepository<CostEntryRow> {
  constructor(db: Database.Database) {
    super(db, 'cost_entries');
  }

  findByCategory(category: string, limit?: number, offset?: number): CostEntryRow[] {
    return this.db.prepare(
      'SELECT * FROM cost_entries WHERE category = ? ORDER BY purchase_date DESC LIMIT ? OFFSET ?'
    ).all(category, limit ?? 20, offset ?? 0) as CostEntryRow[];
  }

  findByEntity(entityType: string, entityId: string): CostEntryRow[] {
    return this.db.prepare(
      'SELECT * FROM cost_entries WHERE entity_type = ? AND entity_id = ? ORDER BY purchase_date DESC'
    ).all(entityType, entityId) as CostEntryRow[];
  }

  getSummaryByCategory(year?: number): { category: string; total_cents: number; count: number }[] {
    const yearFilter = year ? `WHERE strftime('%Y', purchase_date) = ?` : '';
    const params = year ? [String(year)] : [];
    return this.db.prepare(
      `SELECT category, SUM(amount_cents) as total_cents, COUNT(*) as count FROM cost_entries ${yearFilter} GROUP BY category ORDER BY total_cents DESC`
    ).all(...params) as any[];
  }

  getTotalByYear(): { year: string; total_cents: number }[] {
    return this.db.prepare(
      `SELECT strftime('%Y', purchase_date) as year, SUM(amount_cents) as total_cents FROM cost_entries GROUP BY year ORDER BY year DESC`
    ).all() as any[];
  }
}
