-- Migration 018: User authentication and sessions
-- Adds multi-user support with session-based auth and data isolation

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  pin_hash TEXT,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  active_until TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);

-- Add user_id to existing tables (nullable for SQLite ALTER TABLE compatibility)
ALTER TABLE gardens ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE llm_conversations ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE notes ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE tags ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE push_subscriptions ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE seed_inventory ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE cost_entries ADD COLUMN user_id TEXT REFERENCES users(id);
ALTER TABLE feedback ADD COLUMN user_id TEXT REFERENCES users(id);

-- Indexes for user-scoped queries
CREATE INDEX IF NOT EXISTS idx_gardens_user_id ON gardens(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_conversations_user_id ON llm_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_seed_inventory_user_id ON seed_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_user_id ON cost_entries(user_id);

-- Fix tags uniqueness: drop old UNIQUE(name), add UNIQUE(name, user_id)
-- SQLite doesn't support DROP INDEX IF EXISTS on auto-created unique indexes,
-- so we recreate the tags table with the correct constraint.
-- Step 1: Create new table with per-user unique names
CREATE TABLE tags_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(name, user_id)
);

-- Step 2: Copy data
INSERT INTO tags_new (id, name, color, user_id, created_at)
  SELECT id, name, color, user_id, created_at FROM tags;

-- Step 3: Drop old entity_tags FK references, old tags table, rename new
-- entity_tags references tag_id but SQLite doesn't enforce FK on DROP by default
DROP TABLE tags;
ALTER TABLE tags_new RENAME TO tags;

-- Recreate the index
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

-- Backfill: create sentinel admin user
-- Password hash '__NEEDS_SETUP__' signals that the admin must set a real password
INSERT INTO users (id, email, display_name, password_hash, is_admin)
  VALUES ('00000000-0000-0000-0000-000000000001', 'admin@gardenvault.local', 'Admin', '__NEEDS_SETUP__', 1);

-- Assign all existing rows to sentinel admin
UPDATE gardens SET user_id = '00000000-0000-0000-0000-000000000001' WHERE user_id IS NULL;
UPDATE llm_conversations SET user_id = '00000000-0000-0000-0000-000000000001' WHERE user_id IS NULL;
UPDATE notes SET user_id = '00000000-0000-0000-0000-000000000001' WHERE user_id IS NULL;
UPDATE tags SET user_id = '00000000-0000-0000-0000-000000000001' WHERE user_id IS NULL;
UPDATE push_subscriptions SET user_id = '00000000-0000-0000-0000-000000000001' WHERE user_id IS NULL;
UPDATE seed_inventory SET user_id = '00000000-0000-0000-0000-000000000001' WHERE user_id IS NULL;
UPDATE cost_entries SET user_id = '00000000-0000-0000-0000-000000000001' WHERE user_id IS NULL;
UPDATE feedback SET user_id = '00000000-0000-0000-0000-000000000001' WHERE user_id IS NULL;
