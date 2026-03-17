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

describe('Search', () => {
  it('GET /api/v1/search with empty query returns empty', async () => {
    const res = await app.server.inject({ method: 'GET', url: '/api/v1/search?q=', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
  });

  it('GET /api/v1/search finds seeded plants', async () => {
    const res = await app.server.inject({ method: 'GET', url: '/api/v1/search?q=tomato&limit=5', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].entity_type).toBe('plant_catalog');
  });

  it('search finds notes when created', async () => {
    // Create a note
    const noteRes = await app.server.inject({
      method: 'POST',
      url: '/api/v1/notes',
      headers: { cookie },
      payload: {
        content: 'The dragonfruit is growing well in the greenhouse',
      },
    });
    expect(noteRes.statusCode).toBe(201);

    // Search for it
    const res = await app.server.inject({ method: 'GET', url: '/api/v1/search?q=dragonfruit', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data.some((r: any) => r.entity_type === 'note')).toBe(true);
  });

  it('search with special characters does not crash', async () => {
    const res = await app.server.inject({
      method: 'GET',
      url: '/api/v1/search?q=' + encodeURIComponent("it's 100% \"great\""),
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
  });

  it('search with very long query returns results or empty', async () => {
    const longQuery = 'a'.repeat(500);
    const res = await app.server.inject({
      method: 'GET',
      url: `/api/v1/search?q=${longQuery}`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
  });
});
