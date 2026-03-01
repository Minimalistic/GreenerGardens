import type { FastifyInstance } from 'fastify';
import type { GardenService } from '../services/garden.service.js';

export function settingsRoutes(fastify: FastifyInstance, gardenService: GardenService) {
  // GET /api/v1/settings — returns the current garden's settings + garden info
  fastify.get('/api/v1/settings', async () => {
    const gardens = gardenService.findAll();
    if (gardens.length === 0) {
      return { success: true, data: null };
    }
    const garden = gardens[0] as any;
    return {
      success: true,
      data: {
        garden_id: garden.id,
        name: garden.name,
        description: garden.description,
        address: garden.address,
        latitude: garden.latitude,
        longitude: garden.longitude,
        usda_zone: garden.usda_zone,
        timezone: garden.timezone,
        last_frost_date: garden.last_frost_date,
        first_frost_date: garden.first_frost_date,
        total_area_sqft: garden.total_area_sqft,
        settings: garden.settings,
      },
    };
  });

  // PATCH /api/v1/settings — update garden info and/or settings
  fastify.patch('/api/v1/settings', async (request) => {
    const gardens = gardenService.findAll();
    if (gardens.length === 0) {
      return { success: false, error: { code: 'NO_GARDEN', message: 'No garden configured' } };
    }
    const gardenId = (gardens[0] as any).id;
    const updated = gardenService.update(gardenId, request.body);
    return { success: true, data: updated };
  });
}
