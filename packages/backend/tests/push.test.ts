import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp } from './helpers/test-app.js';

let app: Awaited<ReturnType<typeof buildTestApp>>;

beforeAll(async () => {
  app = await buildTestApp();
});

afterAll(async () => {
  await app.close();
});

describe('Push Notifications', () => {
  const testSubscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-123',
    keys: {
      p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfNhs',
      auth: 'tBHItJI5svbpC7_FnMcMSg',
    },
  };

  it('GET /api/v1/push/vapid-key returns configured: false without env vars', async () => {
    const res = await app.server.inject({
      method: 'GET',
      url: '/api/v1/push/vapid-key',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.configured).toBe(false);
    expect(body.data.publicKey).toBeNull();
  });

  it('POST /api/v1/push/subscribe with valid payload returns 201', async () => {
    const res = await app.server.inject({
      method: 'POST',
      url: '/api/v1/push/subscribe',
      payload: {
        subscription: testSubscription,
        preferences: { tasks: true, frost: true, harvests: false },
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.endpoint).toBe(testSubscription.endpoint);
  });

  it('POST /api/v1/push/subscribe with missing fields returns 400', async () => {
    const res = await app.server.inject({
      method: 'POST',
      url: '/api/v1/push/subscribe',
      payload: {
        subscription: { endpoint: 'https://example.com' },
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().success).toBe(false);
  });

  it('subscribe same endpoint twice upserts (no duplicate)', async () => {
    // Subscribe again with different preferences
    const res = await app.server.inject({
      method: 'POST',
      url: '/api/v1/push/subscribe',
      payload: {
        subscription: testSubscription,
        preferences: { tasks: false, frost: true, harvests: true },
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().success).toBe(true);

    // Verify via DB that there's only one row for this endpoint
    const rows = app.db.prepare('SELECT * FROM push_subscriptions WHERE endpoint = ?').all(testSubscription.endpoint);
    expect(rows.length).toBe(1);
  });

  it('PATCH /api/v1/push/preferences updates preferences', async () => {
    const res = await app.server.inject({
      method: 'PATCH',
      url: '/api/v1/push/preferences',
      payload: {
        endpoint: testSubscription.endpoint,
        preferences: { tasks: true, frost: false, harvests: true },
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
  });

  it('PATCH /api/v1/push/preferences for nonexistent endpoint returns 404', async () => {
    const res = await app.server.inject({
      method: 'PATCH',
      url: '/api/v1/push/preferences',
      payload: {
        endpoint: 'https://nonexistent.example.com/push',
        preferences: { tasks: true },
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it('DELETE /api/v1/push/unsubscribe removes subscription', async () => {
    const res = await app.server.inject({
      method: 'DELETE',
      url: '/api/v1/push/unsubscribe',
      payload: { endpoint: testSubscription.endpoint },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);

    // Verify it's gone
    const rows = app.db.prepare('SELECT * FROM push_subscriptions WHERE endpoint = ?').all(testSubscription.endpoint);
    expect(rows.length).toBe(0);
  });

  it('DELETE /api/v1/push/unsubscribe for nonexistent endpoint returns 404', async () => {
    const res = await app.server.inject({
      method: 'DELETE',
      url: '/api/v1/push/unsubscribe',
      payload: { endpoint: 'https://nonexistent.example.com/push' },
    });
    expect(res.statusCode).toBe(404);
  });
});
