import type { BackupService } from '../services/backup.service.js';

const DAILY_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Automatic backup scheduler.
 *
 * - Creates a backup immediately on startup (catches code changes / restarts)
 * - Runs a daily backup every 24 hours thereafter
 * - Skips if a backup was already created within the last hour (avoids
 *   duplicate backups from rapid restarts during development)
 */
export function startAutoBackup(backupService: BackupService): void {
  const runBackup = async (label: string) => {
    try {
      // Skip if a backup was created in the last hour
      const recent = backupService.listBackups();
      if (recent.length > 0) {
        const latestAge = Date.now() - new Date(recent[0].created).getTime();
        if (latestAge < 60 * 60 * 1000) {
          console.log(`[AutoBackup] Skipping ${label} — recent backup exists (${Math.round(latestAge / 60000)}m ago)`);
          return;
        }
      }

      const result = await backupService.createBackup();
      const sizeKb = (result.size / 1024).toFixed(1);
      console.log(`[AutoBackup] ${label}: ${result.filename} (${sizeKb} KB)`);
    } catch (err) {
      console.error(`[AutoBackup] ${label} failed:`, err);
    }
  };

  // Startup backup (slight delay to let migrations finish)
  setTimeout(() => runBackup('startup'), 2000);

  // Daily backup
  setInterval(() => runBackup('daily'), DAILY_INTERVAL);

  console.log('[AutoBackup] Scheduled: startup + every 24h (keeping 30 backups)');
}
