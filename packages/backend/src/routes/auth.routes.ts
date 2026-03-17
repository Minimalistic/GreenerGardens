import type { FastifyInstance } from 'fastify';
import type { AuthService } from '../services/auth.service.js';
import {
  LoginSchema,
  RegisterSchema,
  InitialSetupSchema,
  PinSchema,
  ChangePasswordSchema,
  UpdateProfileSchema,
  DeleteAccountSchema,
} from '@gardenvault/shared';

const COOKIE_NAME = 'gv_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function cookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  };
}

export function registerAuthRoutes(fastify: FastifyInstance, authService: AuthService) {
  const isProduction = process.env.NODE_ENV === 'production';

  // Check if initial setup is needed
  fastify.get('/api/v1/auth/status', async () => {
    return {
      success: true,
      data: { needs_setup: authService.needsInitialSetup() },
    };
  });

  // First-run setup — set admin password
  fastify.post('/api/v1/auth/initial-setup', async (request, reply) => {
    const parsed = InitialSetupSchema.parse(request.body);
    const { user, token } = await authService.initialSetup(
      parsed.password,
      parsed.email,
      parsed.display_name,
    );

    reply.setCookie(COOKIE_NAME, token, cookieOptions(isProduction));
    return { success: true, data: { user } };
  });

  // Register new user
  fastify.post('/api/v1/auth/register', async (request, reply) => {
    const parsed = RegisterSchema.parse(request.body);
    const { user, token } = await authService.register(
      parsed.email,
      parsed.display_name,
      parsed.password,
    );

    reply.setCookie(COOKIE_NAME, token, cookieOptions(isProduction));
    reply.status(201);
    return { success: true, data: { user } };
  });

  // Login
  fastify.post('/api/v1/auth/login', async (request, reply) => {
    const parsed = LoginSchema.parse(request.body);
    const { user, token } = await authService.login(
      parsed.email,
      parsed.password,
      request.headers['user-agent'],
      request.ip,
    );

    reply.setCookie(COOKIE_NAME, token, cookieOptions(isProduction));
    return { success: true, data: { user } };
  });

  // Logout
  fastify.post('/api/v1/auth/logout', async (request, reply) => {
    const token = request.cookies?.[COOKIE_NAME];
    if (token) {
      authService.logout(authService.hashToken(token));
    }
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return { success: true };
  });

  // Get current user + session status
  fastify.get('/api/v1/auth/me', async (request) => {
    const token = request.cookies?.[COOKIE_NAME];
    if (!token) {
      return {
        success: true,
        data: {
          user: null,
          status: 'unauthenticated',
          needs_setup: authService.needsInitialSetup(),
        },
      };
    }

    const tokenHash = authService.hashToken(token);
    const validation = authService.validateSession(tokenHash);

    return {
      success: true,
      data: {
        user: validation.user,
        status: validation.status,
        needs_setup: authService.needsInitialSetup(),
      },
    };
  });

  // PIN management & verification — these need a valid session (even if soft-expired)
  fastify.post('/api/v1/auth/pin/set', async (request, reply) => {
    const token = request.cookies?.[COOKIE_NAME];
    if (!token) {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
      return;
    }

    const tokenHash = authService.hashToken(token);
    const validation = authService.validateSession(tokenHash);
    if (!validation.user) {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Session expired' } });
      return;
    }

    const parsed = PinSchema.parse(request.body);
    await authService.setPin(validation.user.id, parsed.pin);
    return { success: true };
  });

  fastify.post('/api/v1/auth/pin/verify', async (request, reply) => {
    const token = request.cookies?.[COOKIE_NAME];
    if (!token) {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
      return;
    }

    const tokenHash = authService.hashToken(token);
    const validation = authService.validateSession(tokenHash);
    if (!validation.user) {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Session expired' } });
      return;
    }

    const parsed = PinSchema.parse(request.body);
    const valid = await authService.verifyPin(validation.user.id, tokenHash, parsed.pin);
    if (!valid) {
      reply.status(401).send({ success: false, error: { code: 'INVALID_PIN', message: 'Invalid PIN' } });
      return;
    }

    return { success: true };
  });

  fastify.delete('/api/v1/auth/pin', async (request, reply) => {
    const token = request.cookies?.[COOKIE_NAME];
    if (!token) {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
      return;
    }

    const tokenHash = authService.hashToken(token);
    const validation = authService.validateSession(tokenHash);
    if (!validation.user) {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Session expired' } });
      return;
    }

    authService.removePin(validation.user.id);
    return { success: true };
  });

  // Change password (requires auth)
  fastify.post('/api/v1/auth/change-password', async (request, reply) => {
    const token = request.cookies?.[COOKIE_NAME];
    if (!token) {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
      return;
    }

    const tokenHash = authService.hashToken(token);
    const validation = authService.validateSession(tokenHash);
    if (!validation.user || validation.status !== 'active') {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Active session required' } });
      return;
    }

    const parsed = ChangePasswordSchema.parse(request.body);
    await authService.changePassword(validation.user.id, parsed.current_password, parsed.new_password);
    return { success: true };
  });

  // Update profile (requires auth)
  fastify.patch('/api/v1/auth/profile', async (request, reply) => {
    const token = request.cookies?.[COOKIE_NAME];
    if (!token) {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
      return;
    }

    const tokenHash = authService.hashToken(token);
    const validation = authService.validateSession(tokenHash);
    if (!validation.user || validation.status !== 'active') {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Active session required' } });
      return;
    }

    const parsed = UpdateProfileSchema.parse(request.body);
    const user = authService.updateProfile(validation.user.id, parsed);
    return { success: true, data: { user } };
  });

  // List active sessions (requires auth)
  fastify.get('/api/v1/auth/sessions', async (request, reply) => {
    const token = request.cookies?.[COOKIE_NAME];
    if (!token) {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
      return;
    }

    const tokenHash = authService.hashToken(token);
    const validation = authService.validateSession(tokenHash);
    if (!validation.user || validation.status !== 'active') {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Active session required' } });
      return;
    }

    const sessions = authService.getActiveSessions(validation.user.id);
    // Don't expose token_hash to clients
    const safe = sessions.map(s => ({
      id: s.id,
      user_agent: s.user_agent,
      ip_address: s.ip_address,
      active_until: s.active_until,
      expires_at: s.expires_at,
      created_at: s.created_at,
      is_current: s.token_hash === tokenHash,
    }));

    return { success: true, data: safe };
  });

  // Delete account (requires auth + password confirmation)
  fastify.delete('/api/v1/auth/account', async (request, reply) => {
    const token = request.cookies?.[COOKIE_NAME];
    if (!token) {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
      return;
    }

    const tokenHash = authService.hashToken(token);
    const validation = authService.validateSession(tokenHash);
    if (!validation.user || validation.status !== 'active') {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Active session required' } });
      return;
    }

    const parsed = DeleteAccountSchema.parse(request.body);
    await authService.deleteAccount(validation.user.id, parsed.password);

    reply.clearCookie(COOKIE_NAME, { path: '/' });
    reply.status(204);
  });

  // Revoke a session (requires auth)
  fastify.delete<{ Params: { id: string } }>('/api/v1/auth/sessions/:id', async (request, reply) => {
    const token = request.cookies?.[COOKIE_NAME];
    if (!token) {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
      return;
    }

    const tokenHash = authService.hashToken(token);
    const validation = authService.validateSession(tokenHash);
    if (!validation.user || validation.status !== 'active') {
      reply.status(401).send({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Active session required' } });
      return;
    }

    authService.revokeSession(request.params.id, validation.user.id);
    reply.status(204);
  });
}
