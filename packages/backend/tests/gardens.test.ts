import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp } from './helpers/test-app.js';

let app: Awaited<ReturnType<typeof buildTestApp>>;

beforeAll(async () => {
  app = await buildTestApp();
});

afterAll(async () => {
  await app.close();
});

describe('Garden CRUD', () => {
  let gardenId: string;

  it('POST /api/v1/gardens creates a garden', async () => {
    const res = await app.server.inject({
      method: 'POST',
      url: '/api/v1/gardens',
      payload: {
        name: 'Test Garden',
        description: 'A test garden',
        latitude: 40.7128,
        longitude: -74.006,
        usda_zone: '7b',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Test Garden');
    expect(body.data.id).toBeDefined();
    gardenId = body.data.id;
  });

  it('GET /api/v1/gardens lists gardens', async () => {
    const res = await app.server.inject({ method: 'GET', url: '/api/v1/gardens' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/gardens/:id returns a garden', async () => {
    const res = await app.server.inject({ method: 'GET', url: `/api/v1/gardens/${gardenId}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.id).toBe(gardenId);
    expect(body.data.name).toBe('Test Garden');
  });

  it('PATCH /api/v1/gardens/:id updates a garden', async () => {
    const res = await app.server.inject({
      method: 'PATCH',
      url: `/api/v1/gardens/${gardenId}`,
      payload: { name: 'Updated Garden', settings: { temperature_unit: 'celsius' } },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.name).toBe('Updated Garden');
  });

  it('DELETE /api/v1/gardens/:id removes a garden', async () => {
    const res = await app.server.inject({ method: 'DELETE', url: `/api/v1/gardens/${gardenId}` });
    expect(res.statusCode).toBe(204);

    const getRes = await app.server.inject({ method: 'GET', url: `/api/v1/gardens/${gardenId}` });
    expect(getRes.statusCode).toBe(404);
  });

  it('POST /api/v1/gardens with missing name returns error', async () => {
    const res = await app.server.inject({
      method: 'POST',
      url: '/api/v1/gardens',
      payload: { description: 'No name provided' },
    });
    // Zod validation error — returns 4xx or 5xx
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    const body = res.json();
    expect(body.success).toBe(false);
  });

  it('GET nonexistent garden by ID returns 404', async () => {
    const res = await app.server.inject({
      method: 'GET',
      url: '/api/v1/gardens/00000000-0000-0000-0000-000000000000',
    });
    expect(res.statusCode).toBe(404);
  });

  it('PATCH nonexistent garden returns 404', async () => {
    const res = await app.server.inject({
      method: 'PATCH',
      url: '/api/v1/gardens/00000000-0000-0000-0000-000000000000',
      payload: { name: 'Ghost Garden' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('DELETE nonexistent garden returns 404', async () => {
    const res = await app.server.inject({
      method: 'DELETE',
      url: '/api/v1/gardens/00000000-0000-0000-0000-000000000000',
    });
    expect(res.statusCode).toBe(404);
  });

  it('creating two gardens returns both in list', async () => {
    const r1 = await app.server.inject({
      method: 'POST',
      url: '/api/v1/gardens',
      payload: { name: 'Garden Alpha' },
    });
    const r2 = await app.server.inject({
      method: 'POST',
      url: '/api/v1/gardens',
      payload: { name: 'Garden Beta' },
    });
    expect(r1.statusCode).toBe(201);
    expect(r2.statusCode).toBe(201);

    const listRes = await app.server.inject({ method: 'GET', url: '/api/v1/gardens' });
    const names = listRes.json().data.map((g: any) => g.name);
    expect(names).toContain('Garden Alpha');
    expect(names).toContain('Garden Beta');
  });
});
