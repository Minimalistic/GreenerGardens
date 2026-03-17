import { v4 as uuid } from 'uuid';
import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import type Database from 'better-sqlite3';
import { UserRepository, type UserRow } from '../db/repositories/user.repository.js';
import { SessionRepository, type SessionRow } from '../db/repositories/session.repository.js';
import { ValidationError } from '../utils/errors.js';

const SALT_ROUNDS = 12;
const SESSION_HARD_EXPIRY_DAYS = 7;
const SESSION_SOFT_EXPIRY_MINUTES = 15;
const SENTINEL_HASH = '__NEEDS_SETUP__';

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  has_pin: boolean;
}

export type SessionStatus = 'active' | 'pin_required' | 'unauthenticated';

export interface SessionValidation {
  user: AuthUser | null;
  session: SessionRow | null;
  status: SessionStatus;
}

// Rate limiting state (in-memory, resets on restart — fine for single-instance)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export class AuthService {
  private userRepo: UserRepository;
  private sessionRepo: SessionRepository;

  constructor(private db: Database.Database) {
    this.userRepo = new UserRepository(db);
    this.sessionRepo = new SessionRepository(db);
  }

  needsInitialSetup(): boolean {
    return !!this.userRepo.findSentinel();
  }

  async initialSetup(password: string, email?: string, displayName?: string): Promise<{ user: AuthUser; token: string }> {
    const sentinel = this.userRepo.findSentinel();
    if (!sentinel) {
      throw new ValidationError('Initial setup already completed');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    this.userRepo.update(sentinel.id, {
      password_hash: passwordHash,
      email: email ?? sentinel.email,
      display_name: displayName ?? sentinel.display_name,
    });

    const user = this.toAuthUser(this.userRepo.findById(sentinel.id)!);
    const token = this.createSession(sentinel.id);
    return { user, token };
  }

  async register(email: string, displayName: string, password: string): Promise<{ user: AuthUser; token: string }> {
    const existing = this.userRepo.findByEmail(email);
    if (existing) {
      throw new ValidationError('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const id = uuid();
    const row = this.userRepo.insert({
      id,
      email,
      display_name: displayName,
      password_hash: passwordHash,
      is_admin: 0,
    });

    const user = this.toAuthUser(row);
    const token = this.createSession(id);
    return { user, token };
  }

  async login(email: string, password: string, userAgent?: string, ip?: string): Promise<{ user: AuthUser; token: string }> {
    // Rate limiting
    this.checkRateLimit(email);

    const row = this.userRepo.findByEmail(email);
    if (!row || row.password_hash === SENTINEL_HASH) {
      this.recordLoginAttempt(email);
      throw new ValidationError('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      this.recordLoginAttempt(email);
      throw new ValidationError('Invalid email or password');
    }

    // Clear rate limit on success
    loginAttempts.delete(email.toLowerCase());

    const user = this.toAuthUser(row);
    const token = this.createSession(row.id, userAgent, ip);
    return { user, token };
  }

  logout(tokenHash: string): void {
    const session = this.sessionRepo.findByTokenHash(tokenHash);
    if (session) {
      this.sessionRepo.delete(session.id);
    }
  }

  validateSession(tokenHash: string): SessionValidation {
    const session = this.sessionRepo.findByTokenHash(tokenHash);
    if (!session) {
      return { user: null, session: null, status: 'unauthenticated' };
    }

    const now = new Date();

    // Hard expiry check
    if (now > new Date(session.expires_at)) {
      this.sessionRepo.delete(session.id);
      return { user: null, session: null, status: 'unauthenticated' };
    }

    const userRow = this.userRepo.findById(session.user_id);
    if (!userRow) {
      this.sessionRepo.delete(session.id);
      return { user: null, session: null, status: 'unauthenticated' };
    }

    const user = this.toAuthUser(userRow);

    // Soft expiry check — if user has PIN, require PIN re-entry
    if (now > new Date(session.active_until)) {
      if (userRow.pin_hash) {
        return { user, session, status: 'pin_required' };
      }
      // No PIN set — bump active_until (treat as still active)
      this.bumpSession(session.id);
      return { user, session, status: 'active' };
    }

    // Active — bump the soft expiry
    this.bumpSession(session.id);
    return { user, session, status: 'active' };
  }

  async setPin(userId: string, pin: string): Promise<void> {
    const pinHash = await bcrypt.hash(pin, SALT_ROUNDS);
    this.userRepo.update(userId, { pin_hash: pinHash });
  }

  async verifyPin(userId: string, tokenHash: string, pin: string): Promise<boolean> {
    const userRow = this.userRepo.findById(userId);
    if (!userRow?.pin_hash) return false;

    const valid = await bcrypt.compare(pin, userRow.pin_hash);
    if (!valid) return false;

    // Re-activate the session
    const session = this.sessionRepo.findByTokenHash(tokenHash);
    if (session) {
      this.bumpSession(session.id);
    }
    return true;
  }

  removePin(userId: string): void {
    this.userRepo.update(userId, { pin_hash: null });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const userRow = this.userRepo.findById(userId);
    if (!userRow) throw new ValidationError('User not found');

    const valid = await bcrypt.compare(currentPassword, userRow.password_hash);
    if (!valid) throw new ValidationError('Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    this.userRepo.update(userId, { password_hash: passwordHash });
  }

  updateProfile(userId: string, data: { email?: string; display_name?: string }): AuthUser {
    if (data.email) {
      const existing = this.userRepo.findByEmail(data.email);
      if (existing && existing.id !== userId) {
        throw new ValidationError('An account with this email already exists');
      }
    }
    this.userRepo.update(userId, data);
    return this.toAuthUser(this.userRepo.findById(userId)!);
  }

  getActiveSessions(userId: string) {
    return this.sessionRepo.findByUserId(userId);
  }

  revokeSession(sessionId: string, userId: string): boolean {
    const session = this.sessionRepo.findById(sessionId);
    if (!session || session.user_id !== userId) return false;
    return this.sessionRepo.delete(sessionId);
  }

  async deleteAccount(userId: string, password: string): Promise<void> {
    const userRow = this.userRepo.findById(userId);
    if (!userRow) throw new ValidationError('User not found');

    const valid = await bcrypt.compare(password, userRow.password_hash);
    if (!valid) throw new ValidationError('Password is incorrect');

    // Delete all user-owned data in a transaction.
    // Gardens cascade to plots → plant_instances → harvests, tasks, weather_data, etc.
    // LLM conversations cascade to messages. Tags cascade to entity_tags.
    // Sessions have ON DELETE CASCADE from users table.
    const tables = [
      'gardens', 'llm_conversations', 'notes', 'tags',
      'push_subscriptions', 'seed_inventory', 'cost_entries', 'feedback',
    ];
    this.db.transaction(() => {
      for (const table of tables) {
        this.db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(userId);
      }
      this.db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    })();
  }

  cleanupExpiredSessions(): number {
    return this.sessionRepo.deleteExpired();
  }

  // --- Internal helpers ---

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private createSession(userId: string, userAgent?: string, ip?: string): string {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    const now = new Date();
    const activeUntil = new Date(now.getTime() + SESSION_SOFT_EXPIRY_MINUTES * 60_000);
    const expiresAt = new Date(now.getTime() + SESSION_HARD_EXPIRY_DAYS * 24 * 60 * 60_000);

    this.sessionRepo.insert({
      id: uuid(),
      user_id: userId,
      token_hash: tokenHash,
      active_until: activeUntil.toISOString(),
      expires_at: expiresAt.toISOString(),
      user_agent: userAgent ?? null,
      ip_address: ip ?? null,
    });

    return token;
  }

  private bumpSession(sessionId: string): void {
    const activeUntil = new Date(Date.now() + SESSION_SOFT_EXPIRY_MINUTES * 60_000);
    this.sessionRepo.bumpActiveUntil(sessionId, activeUntil.toISOString());
  }

  private toAuthUser(row: UserRow): AuthUser {
    return {
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      is_admin: Boolean(row.is_admin),
      has_pin: !!row.pin_hash,
    };
  }

  private checkRateLimit(email: string): void {
    const key = email.toLowerCase();
    const entry = loginAttempts.get(key);
    if (!entry) return;

    if (Date.now() > entry.resetAt) {
      loginAttempts.delete(key);
      return;
    }

    if (entry.count >= RATE_LIMIT_MAX) {
      throw new ValidationError('Too many login attempts. Please try again later.');
    }
  }

  private recordLoginAttempt(email: string): void {
    const key = email.toLowerCase();
    const entry = loginAttempts.get(key);
    if (!entry || Date.now() > entry.resetAt) {
      loginAttempts.set(key, { count: 1, resetAt: Date.now() + RATE_LIMIT_WINDOW_MS });
    } else {
      entry.count++;
    }
  }
}
