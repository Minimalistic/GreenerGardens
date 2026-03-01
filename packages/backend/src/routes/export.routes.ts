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

  // JSON export for any entity type
  fastify.get<{ Params: { entityType: string } }>(
    '/api/v1/export/:entityType',
    async (request, reply) => {
      const { entityType } = request.params;
      const validTypes = [
        'gardens', 'plots', 'plant_catalog', 'plant_instances',
        'harvests', 'tasks', 'pest_events', 'soil_tests', 'notes',
        'seed_inventory', 'cost_entries', 'history_log',
      ];
      if (!validTypes.includes(entityType)) {
        reply.status(400);
        return { success: false, error: { code: 'VALIDATION_ERROR', message: `Invalid entity type: ${entityType}` } };
      }

      const rows = db.prepare(`SELECT * FROM ${entityType} ORDER BY created_at DESC`).all();
      return { success: true, data: rows };
    },
  );

  // CSV export for any entity type
  fastify.get<{ Params: { entityType: string } }>(
    '/api/v1/export/:entityType/csv',
    async (request, reply) => {
      const { entityType } = request.params;
      const validTypes = [
        'gardens', 'plots', 'plant_catalog', 'plant_instances',
        'harvests', 'tasks', 'pest_events', 'soil_tests', 'notes',
        'seed_inventory', 'cost_entries',
      ];
      if (!validTypes.includes(entityType)) {
        reply.status(400);
        return { success: false, error: { code: 'VALIDATION_ERROR', message: `Invalid entity type: ${entityType}` } };
      }

      const rows = db.prepare(`SELECT * FROM ${entityType}`).all() as Record<string, any>[];
      if (rows.length === 0) {
        reply.header('Content-Type', 'text/csv').send('');
        return;
      }

      const headers = Object.keys(rows[0]);
      const csvRows = rows.map(row =>
        headers.map(h => {
          const val = String(row[h] ?? '');
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(',')
      );
      const csv = [headers.join(','), ...csvRows].join('\n');

      reply
        .header('Content-Type', 'text/csv')
        .header('Content-Disposition', `attachment; filename="${entityType}.csv"`)
        .send(csv);
    },
  );
}
