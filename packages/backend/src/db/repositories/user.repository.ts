import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository.js';

export interface UserRow {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  pin_hash: string | null;
  is_admin: number;
  created_at: string;
  updated_at: string;
}

export class UserRepository extends BaseRepository<UserRow> {
  constructor(db: Database.Database) {
    super(db, 'users');
  }

  findByEmail(email: string): UserRow | undefined {
    return this.db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email) as UserRow | undefined;
  }

  findSentinel(): UserRow | undefined {
    return this.db.prepare("SELECT * FROM users WHERE password_hash = '__NEEDS_SETUP__' AND is_admin = 1 LIMIT 1").get() as UserRow | undefined;
  }

  countAll(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    return row.count;
  }
}
