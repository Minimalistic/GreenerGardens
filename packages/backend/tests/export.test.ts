import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp, createTestUser } from './helpers/test-app.js';

let app: Awaited<ReturnType<typeof buildTestApp>>;
let cookie: string;

beforeAll(async () => {
  app = await buildTestApp({ seed: true });
  ({ cookie } = await createTestUser(app.authService, app.db));
});

afterAll(async () => {
  await app.close();
});

describe('Export API', () => {
  it('GET /api/v1/export/gardens returns JSON with data array', async () => {
    // Create a garden so there's data to export
    await app.server.inject({
      method: 'POST',
      url: '/api/v1/gardens',
      headers: { cookie },
      payload: { name: 'Export Test Garden' },
    });

    const res = await app.server.inject({
      method: 'GET',
      url: '/api/v1/export/gardens',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/export/gardens/csv returns CSV string', async () => {
    const res = await app.server.inject({
      method: 'GET',
      url: '/api/v1/export/gardens/csv',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const csv = res.payload;
    // CSV should have a header row with column names
    expect(csv).toContain('id');
    expect(csv).toContain('name');
  });

  it('GET /api/v1/export/plant_catalog returns seeded catalog data', async () => {
    const res = await app.server.inject({
      method: 'GET',
      url: '/api/v1/export/plant_catalog',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/export/invalid_entity returns 400', async () => {
    const res = await app.server.inject({
      method: 'GET',
      url: '/api/v1/export/unicorns',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().success).toBe(false);
  });

  it('GET /api/v1/export/invalid_entity/csv returns 400', async () => {
    const res = await app.server.inject({
      method: 'GET',
      url: '/api/v1/export/unicorns/csv',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().success).toBe(false);
  });

  it('export empty table returns empty data (not crash)', async () => {
    // cost_entries should be empty in a fresh test DB
    const res = await app.server.inject({
      method: 'GET',
      url: '/api/v1/export/cost_entries',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data).toEqual([]);
  });

  it('CSV export of empty table returns empty string', async () => {
    const res = await app.server.inject({
      method: 'GET',
      url: '/api/v1/export/cost_entries/csv',
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toBe('');
  });
});
