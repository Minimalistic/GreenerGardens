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

describe('Plant Instance lifecycle', () => {
  let gardenId: string;
  let plotId: string;
  let catalogId: string;
  let instanceId: string;

  it('sets up garden, plot, and finds a catalog entry', async () => {
    // Create garden
    const gRes = await app.server.inject({
      method: 'POST',
      url: '/api/v1/gardens',
      headers: { cookie },
      payload: { name: 'Instance Test Garden', latitude: 40.7, longitude: -74.0 },
    });
    gardenId = gRes.json().data.id;

    // Create plot
    const pRes = await app.server.inject({
      method: 'POST',
      url: '/api/v1/plots',
      headers: { cookie },
      payload: {
        garden_id: gardenId,
        name: 'Bed A',
        plot_type: 'raised_bed',
        dimensions: { width_ft: 4, length_ft: 8 },
      },
    });
    plotId = pRes.json().data.id;

    // Get a catalog entry (seeded)
    const cRes = await app.server.inject({
      method: 'GET',
      url: '/api/v1/plant-catalog?limit=1',
      headers: { cookie },
    });
    expect(cRes.json().data.length).toBeGreaterThanOrEqual(1);
    catalogId = cRes.json().data[0].id;
  });

  it('POST /api/v1/plant-instances creates a plant instance', async () => {
    const res = await app.server.inject({
      method: 'POST',
      url: '/api/v1/plant-instances',
      headers: { cookie },
      payload: {
        plant_catalog_id: catalogId,
        plot_id: plotId,
        status: 'planned',
        quantity: 3,
        planting_method: 'direct_seed',
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('planned');
    instanceId = body.data.id;
  });

  it('PATCH /api/v1/plant-instances/:id/status transitions to seed_started', async () => {
    const res = await app.server.inject({
      method: 'PATCH',
      url: `/api/v1/plant-instances/${instanceId}/status`,
      headers: { cookie },
      payload: { status: 'seed_started' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.status).toBe('seed_started');
  });

  it('PATCH /api/v1/plant-instances/:id/status transitions to vegetative', async () => {
    const res = await app.server.inject({
      method: 'PATCH',
      url: `/api/v1/plant-instances/${instanceId}/status`,
      headers: { cookie },
      payload: { status: 'vegetative' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('vegetative');
  });

  it('GET /api/v1/plant-instances lists instances', async () => {
    const res = await app.server.inject({ method: 'GET', url: '/api/v1/plant-instances', headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/plant-instances/:id returns the instance', async () => {
    const res = await app.server.inject({ method: 'GET', url: `/api/v1/plant-instances/${instanceId}`, headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.id).toBe(instanceId);
  });

  it('create with nonexistent plant_catalog_id returns error', async () => {
    const res = await app.server.inject({
      method: 'POST',
      url: '/api/v1/plant-instances',
      headers: { cookie },
      payload: {
        plant_catalog_id: '00000000-0000-0000-0000-000000000000',
        plot_id: plotId,
        status: 'planned',
        quantity: 1,
        planting_method: 'direct_seed',
      },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('create with nonexistent plot_id returns error', async () => {
    const res = await app.server.inject({
      method: 'POST',
      url: '/api/v1/plant-instances',
      headers: { cookie },
      payload: {
        plant_catalog_id: catalogId,
        plot_id: '00000000-0000-0000-0000-000000000000',
        status: 'planned',
        quantity: 1,
        planting_method: 'direct_seed',
      },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('DELETE instance then GET returns 404', async () => {
    // Create a disposable instance
    const createRes = await app.server.inject({
      method: 'POST',
      url: '/api/v1/plant-instances',
      headers: { cookie },
      payload: {
        plant_catalog_id: catalogId,
        plot_id: plotId,
        status: 'planned',
        quantity: 1,
        planting_method: 'direct_seed',
      },
    });
    const tempId = createRes.json().data.id;

    const delRes = await app.server.inject({
      method: 'DELETE',
      url: `/api/v1/plant-instances/${tempId}`,
      headers: { cookie },
    });
    expect(delRes.statusCode).toBe(204);

    const getRes = await app.server.inject({
      method: 'GET',
      url: `/api/v1/plant-instances/${tempId}`,
      headers: { cookie },
    });
    expect(getRes.statusCode).toBe(404);
  });
});
