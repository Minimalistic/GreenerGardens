import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../../../data');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(DATA_DIR, 'gardenvault.db');
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
