import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp } from './helpers/test-app.js';

let app: Awaited<ReturnType<typeof buildTestApp>>;

beforeAll(async () => {
  app = await buildTestApp({ seed: true });
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
      payload: { name: 'Instance Test Garden', latitude: 40.7, longitude: -74.0 },
    });
    gardenId = gRes.json().data.id;

    // Create plot
    const pRes = await app.server.inject({
      method: 'POST',
      url: '/api/v1/plots',
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
    });
    expect(cRes.json().data.length).toBeGreaterThanOrEqual(1);
    catalogId = cRes.json().data[0].id;
  });

  it('POST /api/v1/plant-instances creates a plant instance', async () => {
    const res = await app.server.inject({
      method: 'POST',
      url: '/api/v1/plant-instances',
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
      payload: { status: 'vegetative' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.status).toBe('vegetative');
  });

  it('GET /api/v1/plant-instances lists instances', async () => {
    const res = await app.server.inject({ method: 'GET', url: '/api/v1/plant-instances' });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/plant-instances/:id returns the instance', async () => {
    const res = await app.server.inject({ method: 'GET', url: `/api/v1/plant-instances/${instanceId}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.id).toBe(instanceId);
  });
});
