import type { FastifyInstance } from 'fastify';
import type { LlmService } from '../services/llm.service.js';
import { SendMessageSchema } from '@gardenvault/shared';

export function assistantRoutes(fastify: FastifyInstance, llmService: LlmService) {
  // Check if API key is configured
  fastify.get('/api/v1/assistant/status', async () => {
    return { success: true, data: { configured: llmService.isConfigured() } };
  });

  // List conversations
  fastify.get('/api/v1/assistant/conversations', async () => {
    const data = llmService.listConversations();
    return { success: true, data };
  });

  // Create conversation
  fastify.post<{ Body: { title?: string } }>('/api/v1/assistant/conversations', async (request, reply) => {
    const data = llmService.createConversation(request.body?.title);
    reply.status(201);
    return { success: true, data };
  });

  // Get conversation messages
  fastify.get<{ Params: { id: string } }>('/api/v1/assistant/conversations/:id/messages', async (request) => {
    const data = llmService.getMessages(request.params.id);
    return { success: true, data };
  });

  // Send message — SSE streaming response
  fastify.post<{ Params: { id: string }; Body: { message: string; garden_id: string } }>(
    '/api/v1/assistant/conversations/:id/messages',
    async (request, reply) => {
      const parsed = SendMessageSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400);
        return { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } };
      }

      const { message, garden_id } = parsed.data;
      const conversationId = request.params.id;

      // Set SSE headers on the raw Node response
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });

      try {
        for await (const chunk of llmService.sendMessageStream(conversationId, message, garden_id)) {
          reply.raw.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
        }
        reply.raw.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      } catch (err: any) {
        reply.raw.write(`data: ${JSON.stringify({ error: err.message ?? 'Unknown error' })}\n\n`);
      }

      reply.raw.end();
    },
  );

  // Delete conversation
  fastify.delete<{ Params: { id: string } }>('/api/v1/assistant/conversations/:id', async (request, reply) => {
    llmService.deleteConversation(request.params.id);
    reply.status(204);
  });
}
