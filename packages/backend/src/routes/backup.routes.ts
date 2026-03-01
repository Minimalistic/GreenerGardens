import type { FastifyInstance } from 'fastify';
import type { BackupService } from '../services/backup.service.js';
import fs from 'fs';

export function backupRoutes(fastify: FastifyInstance, backupService: BackupService) {
  fastify.post('/api/v1/backup/create', async (_request, reply) => {
    const data = await backupService.createBackup();
    reply.status(201);
    return { success: true, data: { filename: data.filename, size: data.size } };
  });

  fastify.get('/api/v1/backup/list', async () => {
    const data = backupService.listBackups();
    return { success: true, data };
  });

  fastify.get<{ Params: { filename: string } }>(
    '/api/v1/backup/download/:filename',
    async (request, reply) => {
      const backupPath = backupService.getBackupPath(request.params.filename);
      if (!backupPath) {
        reply.status(404);
        return { success: false, error: { code: 'NOT_FOUND', message: 'Backup not found' } };
      }
      const fileBuffer = fs.readFileSync(backupPath);
      reply
        .header('Content-Type', 'application/x-sqlite3')
        .header('Content-Disposition', `attachment; filename="${request.params.filename}"`)
        .header('Content-Length', fileBuffer.length)
        .send(fileBuffer);
    },
  );

  fastify.delete<{ Params: { filename: string } }>(
    '/api/v1/backup/:filename',
    async (request, reply) => {
      const deleted = backupService.deleteBackup(request.params.filename);
      if (!deleted) {
        reply.status(404);
        return { success: false, error: { code: 'NOT_FOUND', message: 'Backup not found' } };
      }
      reply.status(204);
    },
  );

  fastify.post('/api/v1/backup/integrity-check', async () => {
    const result = backupService.runIntegrityCheck();
    return { success: true, data: { result } };
  });

  fastify.post('/api/v1/backup/vacuum', async () => {
    backupService.runVacuum();
    return { success: true, data: { message: 'VACUUM completed' } };
  });
}
