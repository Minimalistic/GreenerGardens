import type { FastifyInstance } from 'fastify';
import { lookupZoneAccurate, lookupFrostDates } from '../utils/zone-lookup.js';

export function zoneLookupRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/zone-lookup', async (request) => {
    const { lat, lng } = request.query as { lat?: string; lng?: string };
    const latitude = parseFloat(lat ?? '');
    const longitude = parseFloat(lng ?? '');

    if (isNaN(latitude) || isNaN(longitude)) {
      return { success: false, error: 'lat and lng query params required' };
    }

    const result = await lookupZoneAccurate(latitude, longitude);
    const frost = lookupFrostDates(result.zone);

    return {
      success: true,
      data: {
        zone: result.zone,
        source: result.source,
        lastFrost: frost?.lastFrost ?? null,
        firstFrost: frost?.firstFrost ?? null,
      },
    };
  });
}
