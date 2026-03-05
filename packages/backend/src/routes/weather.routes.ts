import type { FastifyInstance } from 'fastify';
import type { WeatherService } from '../services/weather.service.js';

export function weatherRoutes(fastify: FastifyInstance, weatherService: WeatherService) {
  fastify.get('/api/v1/weather/status', async () => {
    return { success: true, data: { configured: weatherService.isConfigured() } };
  });

  fastify.get<{ Querystring: { garden_id?: string } }>('/api/v1/weather/current', async (request) => {
    const gardenId = request.query.garden_id;
    if (!gardenId) {
      return { success: true, data: null, error: 'garden_id query parameter required' };
    }
    const result = await weatherService.fetchCurrentWeather(gardenId);
    return { success: true, ...result };
  });

  fastify.get<{ Querystring: { garden_id?: string } }>('/api/v1/weather/forecast', async (request) => {
    const gardenId = request.query.garden_id;
    if (!gardenId) {
      return { success: true, data: [], error: 'garden_id query parameter required' };
    }
    const result = await weatherService.fetchForecast(gardenId);
    return { success: true, ...result };
  });

  fastify.get<{ Querystring: { garden_id?: string; start?: string; end?: string } }>('/api/v1/weather/history', async (request) => {
    const { garden_id, start, end } = request.query;
    if (!garden_id || !start || !end) {
      return { success: true, data: [] };
    }
    const data = weatherService.getReadingsByDateRange(garden_id, start, end);
    return { success: true, data };
  });

  fastify.get<{ Querystring: { garden_id?: string; start?: string; end?: string } }>('/api/v1/weather/daily-summary', async (request) => {
    const { garden_id, start, end } = request.query;
    if (!garden_id || !start || !end) {
      return { success: true, data: [] };
    }
    const data = weatherService.getDailySummaries(garden_id, start, end);
    return { success: true, data };
  });

  fastify.get<{ Querystring: { garden_id?: string } }>('/api/v1/weather/nws-alerts', async (request) => {
    const gardenId = request.query.garden_id;
    if (!gardenId) {
      return { success: true, data: { alerts: [], headline: null } };
    }
    const result = await weatherService.fetchNwsAlerts(gardenId);
    return { success: true, data: result };
  });

  fastify.get<{ Querystring: { garden_id?: string } }>('/api/v1/weather/location', async (request) => {
    const gardenId = request.query.garden_id;
    if (!gardenId) {
      return { success: true, data: null };
    }
    const location = weatherService.getGardenLocation(gardenId);
    return { success: true, data: location };
  });

  fastify.post<{ Querystring: { garden_id?: string } }>('/api/v1/weather/refresh', async (request) => {
    const gardenId = request.query.garden_id;
    if (!gardenId) {
      return { success: true, data: null, error: 'garden_id query parameter required' };
    }
    const result = await weatherService.fetchCurrentWeather(gardenId);
    return { success: true, ...result };
  });
}
