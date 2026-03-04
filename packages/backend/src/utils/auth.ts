import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Fastify preHandler that requires a valid admin API key.
 * The key is read from the ADMIN_API_KEY environment variable.
 * If the env var is not set, admin routes are left unprotected (dev mode).
 *
 * Clients must send the key via either:
 *   Authorization: Bearer <key>
 *   X-API-Key: <key>
 */
export async function requireAdminKey(request: FastifyRequest, reply: FastifyReply) {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    // No key configured — allow (development mode)
    return;
  }

  const authHeader = request.headers.authorization;
  const apiKeyHeader = request.headers['x-api-key'];

  let provided: string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    provided = authHeader.slice(7);
  } else if (typeof apiKeyHeader === 'string') {
    provided = apiKeyHeader;
  }

  if (!provided || provided !== expected) {
    reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Valid admin API key required' },
    });
  }
}
