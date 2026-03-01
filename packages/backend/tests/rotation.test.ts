import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildTestApp } from './helpers/test-app.js';

let app: Awaited<ReturnType<typeof buildTestApp>>;

beforeAll(async () => {
  app = await buildTestApp({ seed: true });
});

afterAll(async () => {
  await app.close();
});

describe('Crop rotation', () => {
  let gardenId: string;
  let plotId: string;
  let tomatoId: string;

  it('sets up garden and plot, finds tomato', async () => {
    const gRes = await app.server.inject({
      method: 'POST',
      url: '/api/v1/gardens',
      payload: { name: 'Rotation Test Garden' },
    });
    gardenId = gRes.json().data.id;

    const pRes = await app.server.inject({
      method: 'POST',
      url: '/api/v1/plots',
      payload: {
        garden_id: gardenId,
        name: 'Plot R1',
        plot_type: 'raised_bed',
        dimensions: { width_ft: 4, length_ft: 8 },
      },
    });
    plotId = pRes.json().data.id;

    const cRes = await app.server.inject({ method: 'GET', url: '/api/v1/plant-catalog?limit=200' });
    const tomato = cRes.json().data.find((p: any) => p.common_name.toLowerCase().includes('tomato'));
    expect(tomato).toBeDefined();
    tomatoId = tomato.id;
  });

  it('GET /api/v1/rotation/check returns rotation info', async () => {
    const res = await app.server.inject({
      method: 'GET',
      url: `/api/v1/rotation/check?plot=${plotId}&plant=${tomatoId}`,
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  it('GET /api/v1/rotation/history returns plot history', async () => {
    const res = await app.server.inject({
      method: 'GET',
      url: `/api/v1/rotation/history?plot=${plotId}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
  });

  it('GET /api/v1/rotation/suggest returns plot suggestions', async () => {
    const res = await app.server.inject({
      method: 'GET',
      url: `/api/v1/rotation/suggest?plant=${tomatoId}&garden=${gardenId}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
  });

  it('GET /api/v1/rotation/suggest without garden returns error', async () => {
    const res = await app.server.inject({
      method: 'GET',
      url: `/api/v1/rotation/suggest?plant=${tomatoId}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(false);
  });
});
