import type { FastifyInstance } from 'fastify';
import type Database from 'better-sqlite3';
import type { UploadService } from '../services/upload.service.js';
import { assertEntityOwnership } from '../utils/ownership.js';

export function uploadRoutes(fastify: FastifyInstance, uploadService: UploadService, db: Database.Database) {
  // Upload a file — entity linkage happens separately, no ownership check needed at creation
  fastify.post('/api/v1/uploads', async (request, reply) => {
    const data = await (request as any).file();
    if (!data) {
      reply.status(400);
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'No file provided' } };
    }

    const buffer = await data.toBuffer();
    const upload = await uploadService.create({
      filename: data.filename,
      mimetype: data.mimetype,
      data: buffer,
    });
    reply.status(201);
    return { success: true, data: upload };
  });

  // Get upload metadata
  fastify.get<{ Params: { id: string } }>('/api/v1/uploads/:id', async (request) => {
    const row = db.prepare('SELECT entity_type, entity_id FROM uploads WHERE id = ?').get(request.params.id) as { entity_type: string | null; entity_id: string | null } | undefined;
    if (row?.entity_type && row?.entity_id) {
      assertEntityOwnership(db, row.entity_type, row.entity_id, request.userId);
    }
    const upload = uploadService.findById(request.params.id);
    return { success: true, data: upload };
  });

  // Delete upload
  fastify.delete<{ Params: { id: string } }>('/api/v1/uploads/:id', async (request, reply) => {
    const row = db.prepare('SELECT entity_type, entity_id FROM uploads WHERE id = ?').get(request.params.id) as { entity_type: string | null; entity_id: string | null } | undefined;
    if (row?.entity_type && row?.entity_id) {
      assertEntityOwnership(db, row.entity_type, row.entity_id, request.userId);
    }
    uploadService.delete(request.params.id);
    reply.status(204);
  });

  // List uploads for an entity
  fastify.get<{ Params: { entityType: string; entityId: string } }>(
    '/api/v1/uploads/entity/:entityType/:entityId',
    async (request) => {
      assertEntityOwnership(db, request.params.entityType, request.params.entityId, request.userId);
      const uploads = uploadService.findByEntity(request.params.entityType, request.params.entityId);
      return { success: true, data: uploads };
    },
  );
}
