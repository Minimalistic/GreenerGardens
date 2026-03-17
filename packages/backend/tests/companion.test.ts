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

describe('Companion planting', () => {
  let tomatoId: string;
  let basilId: string;

  it('finds tomato and basil in catalog', async () => {
    const res = await app.server.inject({ method: 'GET', url: '/api/v1/plant-catalog?limit=300', headers: { cookie } });
    const plants = res.json().data;

    const tomato = plants.find((p: any) => p.common_name.toLowerCase().includes('tomato'));
    const basil = plants.find((p: any) => p.common_name.toLowerCase().includes('basil'));

    expect(tomato).toBeDefined();
    expect(basil).toBeDefined();

    tomatoId = tomato.id;
    basilId = basil.id;
  });

  it('GET /api/v1/companion/check returns compatibility', async () => {
    const res = await app.server.inject({
      method: 'GET',
      url: `/api/v1/companion/check?plant=${tomatoId}&neighbors=${basilId}`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
  });

  it('GET /api/v1/companion/suggestions returns suggestions', async () => {
    const res = await app.server.inject({
      method: 'GET',
      url: `/api/v1/companion/suggestions?plant=${tomatoId}`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().success).toBe(true);
  });
});
