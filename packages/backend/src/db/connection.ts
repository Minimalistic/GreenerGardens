import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveDbPath(): string {
  const envPath = process.env.DATABASE_PATH;
  if (envPath) {
    return path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
  }
  return path.resolve(__dirname, '../../../../data/gardenvault.db');
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = resolveDbPath();
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(dbPath);

    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL');
    // Enable foreign key enforcement
    db.pragma('foreign_keys = ON');
    // Set busy timeout to 5 seconds
    db.pragma('busy_timeout = 5000');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Clean shutdown handlers
process.on('exit', closeDb);
process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});
process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});
