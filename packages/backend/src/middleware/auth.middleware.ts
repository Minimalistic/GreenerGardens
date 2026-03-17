import type { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthService } from '../services/auth.service.js';

export function authMiddleware(authService: AuthService) {
  return async function authenticate(request: FastifyRequest, reply: FastifyReply) {
    const token = request.cookies?.gv_session;

    if (!token) {
      reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Authentication required' },
      });
      return;
    }

    const tokenHash = authService.hashToken(token);
    const validation = authService.validateSession(tokenHash);

    if (validation.status === 'unauthenticated' || !validation.user) {
      reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHENTICATED', message: 'Session expired. Please log in again.' },
      });
      return;
    }

    if (validation.status === 'pin_required') {
      // 423 Locked — client should show PIN gate
      reply.status(423).send({
        success: false,
        error: { code: 'PIN_REQUIRED', message: 'Session locked. Please enter your PIN.' },
      });
      return;
    }

    // Attach user info to request
    request.userId = validation.user.id;
    request.user = validation.user;
  };
}
