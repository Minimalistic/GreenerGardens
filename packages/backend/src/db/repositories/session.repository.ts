import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository.js';

export interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  active_until: string;
  expires_at: string;
  user_agent: string | null;
  ip_address: string | null;
  created_at: string;
}

export class SessionRepository extends BaseRepository<SessionRow> {
  constructor(db: Database.Database) {
    super(db, 'sessions');
  }

  findByTokenHash(tokenHash: string): SessionRow | undefined {
    return this.db.prepare('SELECT * FROM sessions WHERE token_hash = ?').get(tokenHash) as SessionRow | undefined;
  }

  findByUserId(userId: string): SessionRow[] {
    return this.db.prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC').all(userId) as SessionRow[];
  }

  deleteExpired(): number {
    const result = this.db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
    return result.changes;
  }

  deleteByUserId(userId: string): number {
    const result = this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    return result.changes;
  }

  bumpActiveUntil(id: string, activeUntil: string): void {
    this.db.prepare('UPDATE sessions SET active_until = ? WHERE id = ?').run(activeUntil, id);
  }
}
