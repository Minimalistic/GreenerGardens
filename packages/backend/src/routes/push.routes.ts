import type { FastifyInstance } from 'fastify';
import type { PushService } from '../services/push.service.js';

export function pushRoutes(fastify: FastifyInstance, pushService: PushService) {
  // Get VAPID public key for client-side subscription
  fastify.get('/api/v1/push/vapid-key', async () => {
    const key = pushService.getPublicKey();
    return {
      success: true,
      data: { publicKey: key, configured: pushService.isConfigured() },
    };
  });

  // Subscribe to push notifications
  fastify.post('/api/v1/push/subscribe', async (request, reply) => {
    const { subscription, preferences } = request.body as {
      subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
      preferences?: Record<string, boolean>;
    };

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      reply.status(400);
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'subscription with endpoint and keys required' },
      };
    }

    const data = pushService.subscribe(subscription, preferences ?? {});
    reply.status(201);
    return { success: true, data };
  });

  // Unsubscribe from push notifications
  fastify.delete('/api/v1/push/unsubscribe', async (request, reply) => {
    const { endpoint } = request.body as { endpoint: string };
    if (!endpoint) {
      reply.status(400);
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'endpoint required' },
      };
    }

    const removed = pushService.unsubscribe(endpoint);
    if (!removed) {
      reply.status(404);
      return { success: false, error: { code: 'NOT_FOUND', message: 'Subscription not found' } };
    }
    return { success: true };
  });

  // Update notification preferences
  fastify.patch('/api/v1/push/preferences', async (request, reply) => {
    const { endpoint, preferences } = request.body as {
      endpoint: string;
      preferences: Record<string, boolean>;
    };

    if (!endpoint || !preferences) {
      reply.status(400);
      return {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'endpoint and preferences required' },
      };
    }

    const data = pushService.updatePreferences(endpoint, preferences);
    if (!data) {
      reply.status(404);
      return { success: false, error: { code: 'NOT_FOUND', message: 'Subscription not found' } };
    }
    return { success: true, data };
  });
}
