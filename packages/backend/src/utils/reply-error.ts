import type { FastifyReply } from 'fastify';

export function replyError(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
) {
  reply.status(status);
  return { success: false, error: { code, message } };
}
