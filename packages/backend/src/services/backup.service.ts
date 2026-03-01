import type Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export class BackupService {
  private backupDir: string;
  private maxBackups: number;

  constructor(
    private db: Database.Database,
    backupDir?: string,
    maxBackups?: number,
  ) {
    this.backupDir = backupDir ?? path.resolve(process.cwd(), 'data', 'backups');
    this.maxBackups = maxBackups ?? 7;
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup(): Promise<{ filename: string; size: number; path: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `gardenvault-${timestamp}.db`;
    const backupPath = path.join(this.backupDir, filename);

    await this.db.backup(backupPath);
    this.rotateBackups();

    const stats = fs.statSync(backupPath);
    return { filename, size: stats.size, path: backupPath };
  }

  listBackups(): { filename: string; size: number; created: string }[] {
    if (!fs.existsSync(this.backupDir)) return [];
    return fs.readdirSync(this.backupDir)
      .filter(f => f.endsWith('.db'))
      .map(filename => {
        const stats = fs.statSync(path.join(this.backupDir, filename));
        return { filename, size: stats.size, created: stats.mtime.toISOString() };
      })
      .sort((a, b) => b.created.localeCompare(a.created));
  }

  getBackupPath(filename: string): string | null {
    const backupPath = path.join(this.backupDir, filename);
    if (!fs.existsSync(backupPath)) return null;
    // Prevent path traversal
    if (!backupPath.startsWith(this.backupDir)) return null;
    return backupPath;
  }

  deleteBackup(filename: string): boolean {
    const backupPath = this.getBackupPath(filename);
    if (!backupPath) return false;
    fs.unlinkSync(backupPath);
    return true;
  }

  runIntegrityCheck(): string {
    const result = this.db.pragma('integrity_check') as any[];
    return result[0]?.integrity_check ?? 'unknown';
  }

  runVacuum(): void {
    this.db.exec('VACUUM');
  }

  private rotateBackups(): void {
    const backups = this.listBackups();
    if (backups.length > this.maxBackups) {
      for (const old of backups.slice(this.maxBackups)) {
        const fullPath = path.join(this.backupDir, old.filename);
        fs.unlinkSync(fullPath);
      }
    }
  }
}
