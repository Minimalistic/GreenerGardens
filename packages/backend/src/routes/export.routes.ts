import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';

export function exportRoutes(fastify: FastifyInstance, db: Database.Database) {
  // GET /api/v1/export/database-file — download a consistent SQLite backup
  fastify.get('/api/v1/export/database-file', async (_request, reply) => {
    const today = new Date().toISOString().split('T')[0];
    const fileName = `gardenvault-backup-${today}.db`;
    const tmpDir = os.tmpdir();
    const backupPath = path.join(tmpDir, fileName);

    try {
      // Use better-sqlite3's backup API for a consistent snapshot
      await db.backup(backupPath);

      const fileBuffer = fs.readFileSync(backupPath);

      reply
        .header('Content-Type', 'application/x-sqlite3')
        .header('Content-Disposition', `attachment; filename="${fileName}"`)
        .header('Content-Length', fileBuffer.length)
        .send(fileBuffer);
    } finally {
      // Clean up temp file
      fs.unlink(backupPath, () => {});
    }
  });
}
