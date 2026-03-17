import type { AuthService } from '../services/auth.service.js';

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function startSessionCleanupJob(authService: AuthService): void {
  // Run immediately on startup
  setTimeout(() => {
    const deleted = authService.cleanupExpiredSessions();
    if (deleted > 0) {
      console.log(`[Session Cleanup] Removed ${deleted} expired sessions`);
    }
  }, 5000);

  // Then run hourly
  setInterval(() => {
    const deleted = authService.cleanupExpiredSessions();
    if (deleted > 0) {
      console.log(`[Session Cleanup] Removed ${deleted} expired sessions`);
    }
  }, CLEANUP_INTERVAL_MS);
}
