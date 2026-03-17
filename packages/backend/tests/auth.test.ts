import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp, createTestUser, authenticatedInject } from './helpers/test-app.js';

describe('Auth', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Initial Setup', () => {
    it('should report needs_setup for sentinel user', async () => {
      const res = await app.server.inject({ method: 'GET', url: '/api/v1/auth/status' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.needs_setup).toBe(true);
    });

    it('should complete initial setup', async () => {
      const res = await app.server.inject({
        method: 'POST',
        url: '/api/v1/auth/initial-setup',
        payload: { password: 'adminpassword123', email: 'admin@test.local', display_name: 'Admin' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.user.email).toBe('admin@test.local');
      expect(body.data.user.is_admin).toBe(true);

      // Cookie should be set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });

    it('should report needs_setup=false after setup', async () => {
      const res = await app.server.inject({ method: 'GET', url: '/api/v1/auth/status' });
      const body = JSON.parse(res.payload);
      expect(body.data.needs_setup).toBe(false);
    });
  });

  describe('Registration', () => {
    it('should register a new user', async () => {
      const res = await app.server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'user@test.local', display_name: 'User', password: 'userpassword123' },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.data.user.email).toBe('user@test.local');
      expect(body.data.user.is_admin).toBe(false);
    });

    it('should reject duplicate email', async () => {
      const res = await app.server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'user@test.local', display_name: 'Dupe', password: 'password12345' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await app.server.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'short@test.local', display_name: 'Short', password: 'abc' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('Login/Logout', () => {
    it('should login with correct credentials', async () => {
      const res = await app.server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'user@test.local', password: 'userpassword123' },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.user.email).toBe('user@test.local');
    });

    it('should reject wrong password', async () => {
      const res = await app.server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'user@test.local', password: 'wrongpassword' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should reject nonexistent email', async () => {
      const res = await app.server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'nobody@test.local', password: 'password123' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should logout and invalidate session', async () => {
      // Login first
      const loginRes = await app.server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'user@test.local', password: 'userpassword123' },
      });
      const setCookie = loginRes.headers['set-cookie'] as string;
      const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
      const match = cookieStr?.match(/gv_session=([^;]+)/);
      const cookie = match ? `gv_session=${match[1]}` : '';

      // Logout
      const logoutRes = await app.server.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: { cookie },
      });
      expect(logoutRes.statusCode).toBe(200);

      // Subsequent request should fail
      const meRes = await app.server.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie },
      });
      const meBody = JSON.parse(meRes.payload);
      expect(meBody.data.status).toBe('unauthenticated');
    });
  });

  describe('Protected Routes', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const res = await app.server.inject({ method: 'GET', url: '/api/v1/gardens' });
      expect(res.statusCode).toBe(401);
    });

    it('should allow authenticated requests', async () => {
      const { cookie } = await createTestUser(app.authService, app.db);
      const res = await app.server.inject({
        method: 'GET',
        url: '/api/v1/gardens',
        headers: { cookie },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe('Delete Account', () => {
    it('should delete account with correct password + confirmation', async () => {
      const email = 'delete-me@test.local';
      const password = 'deletepassword123';
      const { cookie, userId } = await createTestUser(app.authService, app.db, { email, password });

      // Create a garden so we can verify cascading deletion
      await app.server.inject({
        method: 'POST',
        url: '/api/v1/gardens',
        headers: { cookie },
        payload: { name: 'Doomed Garden' },
      });

      const res = await app.server.inject({
        method: 'DELETE',
        url: '/api/v1/auth/account',
        headers: { cookie },
        payload: { password, confirmation: 'DELETE' },
      });
      expect(res.statusCode).toBe(204);

      // User should be gone
      const row = app.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      expect(row).toBeUndefined();

      // Gardens should be gone too
      const gardens = app.db.prepare('SELECT * FROM gardens WHERE user_id = ?').all(userId);
      expect(gardens).toHaveLength(0);
    });

    it('should reject wrong password', async () => {
      const { cookie } = await createTestUser(app.authService, app.db, { email: 'keep-me@test.local', password: 'realpass12345' });
      const res = await app.server.inject({
        method: 'DELETE',
        url: '/api/v1/auth/account',
        headers: { cookie },
        payload: { password: 'wrongpassword', confirmation: 'DELETE' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('should reject missing confirmation', async () => {
      const { cookie } = await createTestUser(app.authService, app.db, { email: 'keep2@test.local', password: 'realpass12345' });
      const res = await app.server.inject({
        method: 'DELETE',
        url: '/api/v1/auth/account',
        headers: { cookie },
        payload: { password: 'realpass12345', confirmation: 'YOLO' },
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /auth/me', () => {
    it('should return user for valid session', async () => {
      const { cookie } = await createTestUser(app.authService, app.db, { email: 'me-test@test.local' });
      const res = await app.server.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: { cookie },
      });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.status).toBe('active');
      expect(body.data.user.email).toBe('me-test@test.local');
    });

    it('should return unauthenticated without cookie', async () => {
      const res = await app.server.inject({ method: 'GET', url: '/api/v1/auth/me' });
      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.status).toBe('unauthenticated');
      expect(body.data.user).toBeNull();
    });
  });
});
