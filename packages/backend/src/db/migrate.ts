import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_MIGRATIONS_DIR = path.join(__dirname, 'migrations');

export function runMigrations(db: Database.Database, migrationsDir?: string): void {
  const dir = migrationsDir ?? DEFAULT_MIGRATIONS_DIR;

  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Get list of applied migrations
  const applied = new Set(
    db.prepare('SELECT name FROM _migrations').all()
      .map((row) => (row as { name: string }).name)
  );

  // Read migration files
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const pending = files.filter(f => !applied.has(f));

  // Auto-backup before applying new migrations (skip for fresh DBs)
  if (pending.length > 0 && applied.size > 0) {
    try {
      const backupDir = path.resolve(process.cwd(), 'data', 'backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `gardenvault-pre-migration-${timestamp}.db`);
      db.backup(backupPath).then(() => {
        console.log(`[Migration] Pre-migration backup: ${path.basename(backupPath)}`);
      });
    } catch (err) {
      console.warn('[Migration] Pre-migration backup failed (continuing):', err);
    }
  }

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf-8');

    // Run each migration in a transaction
    const migrate = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    });

    migrate();
    console.log(`Applied migration: ${file}`);
  }
}
