import type { FastifyInstance } from 'fastify';
import type { UploadService } from '../services/upload.service.js';

export function uploadRoutes(fastify: FastifyInstance, uploadService: UploadService) {
  // Upload a file
  fastify.post('/api/v1/uploads', async (request, reply) => {
    const data = await request.file();
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
    const upload = uploadService.findById(request.params.id);
    return { success: true, data: upload };
  });

  // Delete upload
  fastify.delete<{ Params: { id: string } }>('/api/v1/uploads/:id', async (request, reply) => {
    uploadService.delete(request.params.id);
    reply.status(204);
  });

  // List uploads for an entity
  fastify.get<{ Params: { entityType: string; entityId: string } }>(
    '/api/v1/uploads/entity/:entityType/:entityId',
    async (request) => {
      const uploads = uploadService.findByEntity(request.params.entityType, request.params.entityId);
      return { success: true, data: uploads };
    },
  );
}
