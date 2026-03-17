import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp, createTestUser, authenticatedInject } from './helpers/test-app.js';

describe('Data Ownership Isolation', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;
  let userA: { userId: string; cookie: string };
  let userB: { userId: string; cookie: string };
  let gardenAId: string;

  beforeAll(async () => {
    app = await buildTestApp({ seed: true });

    // Create two users
    userA = await createTestUser(app.authService, app.db, { email: 'userA@test.local', displayName: 'User A' });
    userB = await createTestUser(app.authService, app.db, { email: 'userB@test.local', displayName: 'User B' });

    // User A creates a garden
    const injectA = authenticatedInject(app.server, userA.cookie);
    const gardenRes = await injectA({
      method: 'POST',
      url: '/api/v1/gardens',
      payload: { name: 'Garden A', usda_zone: '7a' },
    });
    gardenAId = JSON.parse(gardenRes.payload).data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Garden isolation', () => {
    it('User A can see their garden', async () => {
      const res = await app.server.inject({
        method: 'GET',
        url: '/api/v1/gardens',
        headers: { cookie: userA.cookie },
      });
      const body = JSON.parse(res.payload);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe('Garden A');
    });

    it('User B sees empty gardens list', async () => {
      const res = await app.server.inject({
        method: 'GET',
        url: '/api/v1/gardens',
        headers: { cookie: userB.cookie },
      });
      const body = JSON.parse(res.payload);
      expect(body.data).toHaveLength(0);
    });

    it('User B gets 404 for User A garden', async () => {
      const res = await app.server.inject({
        method: 'GET',
        url: `/api/v1/gardens/${gardenAId}`,
        headers: { cookie: userB.cookie },
      });
      expect(res.statusCode).toBe(404);
    });

    it('User B cannot update User A garden', async () => {
      const res = await app.server.inject({
        method: 'PATCH',
        url: `/api/v1/gardens/${gardenAId}`,
        headers: { cookie: userB.cookie },
        payload: { name: 'Hijacked' },
      });
      expect(res.statusCode).toBe(404);
    });

    it('User B cannot delete User A garden', async () => {
      const res = await app.server.inject({
        method: 'DELETE',
        url: `/api/v1/gardens/${gardenAId}`,
        headers: { cookie: userB.cookie },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Note isolation', () => {
    let noteAId: string;

    it('User A can create a note', async () => {
      const res = await app.server.inject({
        method: 'POST',
        url: '/api/v1/notes',
        headers: { cookie: userA.cookie },
        payload: { content: 'User A note', content_type: 'text' },
      });
      expect(res.statusCode).toBe(201);
      noteAId = JSON.parse(res.payload).data.id;
    });

    it('User B cannot see User A notes', async () => {
      const res = await app.server.inject({
        method: 'GET',
        url: '/api/v1/notes',
        headers: { cookie: userB.cookie },
      });
      const body = JSON.parse(res.payload);
      expect(body.data).toHaveLength(0);
    });

    it('User B gets 404 for User A note', async () => {
      const res = await app.server.inject({
        method: 'GET',
        url: `/api/v1/notes/${noteAId}`,
        headers: { cookie: userB.cookie },
      });
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Tag isolation', () => {
    let tagAId: string;

    it('Both users can create tags with same name', async () => {
      const resA = await app.server.inject({
        method: 'POST',
        url: '/api/v1/tags',
        headers: { cookie: userA.cookie },
        payload: { name: 'organic' },
      });
      expect(resA.statusCode).toBe(201);
      tagAId = JSON.parse(resA.payload).data.id;

      const resB = await app.server.inject({
        method: 'POST',
        url: '/api/v1/tags',
        headers: { cookie: userB.cookie },
        payload: { name: 'organic' },
      });
      expect(resB.statusCode).toBe(201);
      expect(JSON.parse(resB.payload).data.id).not.toBe(tagAId);
    });

    it('User B cannot see User A tags', async () => {
      const res = await app.server.inject({
        method: 'GET',
        url: '/api/v1/tags',
        headers: { cookie: userB.cookie },
      });
      const body = JSON.parse(res.payload);
      // Should only have User B's tag
      const tagNames = body.data.map((t: any) => t.name);
      expect(tagNames).toContain('organic');
      expect(body.data).toHaveLength(1);
    });
  });

  describe('Seed inventory isolation', () => {
    it('User B cannot see User A seeds', async () => {
      // Create a seed for user A
      await app.server.inject({
        method: 'POST',
        url: '/api/v1/seed-inventory',
        headers: { cookie: userA.cookie },
        payload: { variety: 'Roma', source: 'Store', quantity_packets: 5 },
      });

      // User B should see empty
      const res = await app.server.inject({
        method: 'GET',
        url: '/api/v1/seed-inventory',
        headers: { cookie: userB.cookie },
      });
      const body = JSON.parse(res.payload);
      expect(body.data).toHaveLength(0);
    });
  });
});
